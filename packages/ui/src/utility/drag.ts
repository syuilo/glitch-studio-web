export function dragListen(move: (ev: MouseEvent) => void, end?: () => void) {
	window.addEventListener('mousemove', move);
	window.addEventListener('mouseleave', dragClear.bind(null, move, end));
	window.addEventListener('mouseup', dragClear.bind(null, move, end));
}

function dragClear(move, end?) {
	if (end) end();
	window.removeEventListener('mousemove', move);
	window.removeEventListener('mouseleave', dragClear);
	window.removeEventListener('mouseup', dragClear);
}

