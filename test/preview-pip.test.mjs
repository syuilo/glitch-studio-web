import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { ref, shallowRef } from 'vue';

function preview(request) {
	const source = readFileSync(new URL('../src/components/GsPreview.vue', import.meta.url), 'utf8');
	const script = source.split('<script lang="ts" setup>')[1].split('</script>')[0].replace(/^import .*;\r?\n/gm, '');
	const compiled = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
	const cleanup = [];
	const errors = [];
	const clocks = [];
	const listeners = new Map();
	const home = { append: el => { el.parentNode = home; } };
	const element = { parentNode: home, getBoundingClientRect: () => ({ width: 640, height: 360 }) };
	const pip = {
		closed: false, focus() {},
		addEventListener: (name, fn) => listeners.set(name, fn),
		removeEventListener: name => listeners.delete(name),
		close() { this.closed = true; listeners.get('pagehide')?.(); },
		document: { head: { append() {} }, body: { append: el => { el.parentNode = pip.document.body; } } },
	};
	const document = { querySelectorAll: () => [] };
	let requests = 0;
	const window = { document, documentPictureInPicture: { requestWindow: () => { requests++; return request ? request(pip) : Promise.resolve(pip); } } };
	const env = {
		ref, shallowRef, resolutionFactor: ref(1), watch() {}, useTemplateRef: name => shallowRef(name === 'preview' ? element : home),
		onBeforeUnmount: fn => cleanup.push(fn),
		window, document, engine: { setRenderWindow: win => clocks.push(win) },
		ui: { alert: options => errors.push(options), contextMenu() {} },
	};
	const api = new Function(...Object.keys(env), compiled + '\nreturn { startPip, closePip, pipWindow };')(...Object.values(env));
	return { ...api, element, home, pip, window, errors, clocks, requests: () => requests, unmount: () => cleanup.forEach(fn => fn()) };
}

test('PiP moves the existing preview and restores it on native close and repeated opening', async () => {
	const p = preview();
	await p.startPip();
	assert.equal(p.element.parentNode, p.pip.document.body);
	assert.equal(p.clocks.at(-1), p.pip);
	await p.startPip();
	assert.equal(p.requests(), 1);
	p.pip.close();
	assert.equal(p.element.parentNode, p.home);
	assert.equal(p.pipWindow.value, null);
	assert.equal(p.clocks.at(-1), p.window);
	p.pip.closed = false;
	await p.startPip();
	p.closePip();
	assert.equal(p.element.parentNode, p.home);
	assert.equal(p.pip.closed, true);
});

test('PiP failure leaves the preview at home and permits retry', async () => {
	const p = preview(() => Promise.reject(new Error('blocked')));
	await p.startPip();
	await p.startPip();
	assert.equal(p.requests(), 2);
	assert.equal(p.errors.length, 2);
	assert.equal(p.element.parentNode, p.home);
});

test('unmount during opening closes the late window; duplicate requests are ignored', async () => {
	let resolve;
	const p = preview(() => new Promise(r => { resolve = r; }));
	const pending = p.startPip();
	await p.startPip();
	assert.equal(p.requests(), 1);
	p.unmount();
	resolve(p.pip);
	await pending;
	assert.equal(p.pip.closed, true);
	assert.equal(p.element.parentNode, p.home);
});

test('unmount returns the preview before Vue removes its DOM', async () => {
	const p = preview();
	await p.startPip();
	p.unmount();
	assert.equal(p.element.parentNode, p.home);
	assert.equal(p.pip.closed, true);
});

test('partial PiP setup failure restores the preview and closes the window', async () => {
	const p = preview();
	p.pip.document.body.append = () => { throw new Error('setup failed'); };
	await p.startPip();
	assert.equal(p.element.parentNode, p.home);
	assert.equal(p.pip.closed, true);
	assert.equal(p.pipWindow.value, null);
	assert.equal(p.errors.length, 1);
});

test('render loop switches clocks without duplicating frames and preserves the clock on restart', () => {
	const source = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class Engine', 'class Engine');
	const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
	const clock = () => {
		let id = 0;
		const callbacks = new Map();
		return { callbacks, requestAnimationFrame(fn) { callbacks.set(++id, fn); return id; }, cancelAnimationFrame(id) { callbacks.delete(id); } };
	};
	const main = clock();
	const pip = clock();
	const Engine = new Function('ref', 'shallowReactive', 'window', compiled + '\nreturn Engine;')(ref, value => value, main);
	const engine = new Engine();
	engine.startRenderLoop();
	assert.equal(main.callbacks.size, 1);
	engine.setRenderWindow(pip);
	assert.equal(main.callbacks.size, 0);
	assert.equal(pip.callbacks.size, 1);
	engine.startRenderLoop();
	assert.equal(pip.callbacks.size, 1);
	engine.setRenderWindow(main);
	assert.equal(pip.callbacks.size, 0);
	assert.equal(main.callbacks.size, 1);
	engine.stopRenderLoop();
	engine.setRenderWindow(pip);
	assert.equal(pip.callbacks.size, 0, 'switching windows must not start a stopped loop');
});

