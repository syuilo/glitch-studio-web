import { deepClone } from '@glitch/shared/utility/deep-clone.js';
import { customRef, ref, watch, onScopeDispose } from 'vue';
import { EventEmitter } from 'eventemitter3';
import { deepEqual } from '@glitch/shared/utility/deep-equal.js';
import type { Ref } from 'vue';

export const PREF_DEF = definePreferences({
	animation: { default: true },
	menuStyle: { default: 'auto' },
	locale: { default: 'en' },
	animatedBgInPreview: { default: false },
});

type PREF = typeof PREF_DEF;
type DefaultValues = {
	[K in keyof PREF]: PREF[K]['default'] extends (...args: any) => infer R ? R : PREF[K]['default'];
};
type ValueOf<K extends keyof PREF> = DefaultValues[K];

type PreferencesDefinitionRecord<Default> = {
	default: Default;
};

export type PreferencesDefinition = Record<string, PreferencesDefinitionRecord<any>>;

type PreferencesManagerEvents = {
	'committed': <K extends keyof PREF>(ctx: {
		key: K;
		value: ValueOf<K>;
		oldValue: ValueOf<K>;
	}) => void;
};

export function definePreferences<T extends Record<string, unknown>>(x: {
	[K in keyof T]: PreferencesDefinitionRecord<T[K]>
}): {
	[K in keyof T]: PreferencesDefinitionRecord<T[K]>
} {
	return x;
}

export function getInitialPrefValue<K extends keyof PREF>(k: K): ValueOf<K> {
	const _default = PREF_DEF[k].default;
	if (typeof _default === 'function') { // factory
		return _default() as ValueOf<K>;
	} else {
		// 参照渡しになるのを防ぐためclone
		return deepClone(_default as unknown as ValueOf<K>);
	}
}

export class PreferencesManager extends EventEmitter<PreferencesManagerEvents> {
	/**
	 * static / state の略 (static が予約語のため)
	 */
	public s = {} as {
		[K in keyof PREF]: ValueOf<K>;
	};

	/**
	 * reactive の略
	 */
	public r = {} as {
		[K in keyof PREF]: Ref<ValueOf<K>>;
	};

	constructor() {
		super();

		const states = this.genStates();

		// apply states
		for (const key in states) {
			(this.s[key as keyof PREF] as any) = states[key as keyof PREF];
			(this.r[key as keyof PREF] as Ref<any>) = ref(this.s[key as keyof PREF]);
		}
	}

	private rewriteRawState<K extends keyof PREF>(key: K, value: ValueOf<K>) {
		const v = JSON.parse(JSON.stringify(value)); // deep copy 兼 vueのプロキシ解除
		this.r[key].value = this.s[key] = v;
	}

	// TODO: desync対策 cloudの値のfetchが正常に完了していない状態でcommitすると多分値が上書きされる
	public commit<K extends keyof PREF>(key: K, value: ValueOf<K>) {
		const v = JSON.parse(JSON.stringify(value)); // deep copy 兼 vueのプロキシ解除

		if (deepEqual(this.s[key], v)) {
			return;
		}

		this.rewriteRawState(key, v);

		const _save = () => {
			this.save();
			this.emit('committed', {
				key,
				value: v,
				oldValue: this.s[key],
			});
		};

		_save();
	}

	/**
	 * 特定のキーの、簡易的なcomputed refを作ります
	 * 主にvue上で設定コントロールのmodelとして使う用
	 */
	public model<K extends keyof PREF, V = ValueOf<K>>(
		key: K,
	): Ref<V>;
	public model<K extends keyof PREF, V extends Exclude<any, ValueOf<K>>>(
		key: K,
		getter: (v: ValueOf<K>) => V,
		setter: (v: V) => ValueOf<K>,
	): Ref<V>;

	public model<K extends keyof PREF, V>(
		key: K,
		getter?: (v: ValueOf<K>) => V,
		setter?: (v: V) => ValueOf<K>,
	): Ref<V> {
		return customRef<V>((track, trigger) => {
			const watchStop = watch(this.r[key], () => {
				trigger();
			});

			onScopeDispose(() => {
				watchStop();
			}, true);

			return {
				get: () => {
					track();
					return (getter != null ? getter(this.s[key]) : this.s[key]) as V;
				},
				set: (value) => {
					const val = setter != null ? setter(value) : value;
					this.commit(key, val as ValueOf<K>);
				},
			};
		});
	}

	private genStates() {
		const states = {} as { [K in keyof PREF]: ValueOf<K> };
		for (const _key in PREF_DEF) {
			const key = _key as keyof PREF;
			(states[key] as any) = getInitialPrefValue(key);
		}

		return states;
	}

	public save() {
		this.io.save({ profile: this.profile });
	}

	public getPerPrefMenu<K extends keyof PREF>(key: K): MenuItem[] {
		return [{
			icon: 'ti ti-refresh',
			text: i18n.ts.resetToDefaultValue,
			danger: true,
			action: () => {
				this.commit(key, getInitialPrefValue(key));
			},
		}];
	}
}

export const prefer = new PreferencesManager();
