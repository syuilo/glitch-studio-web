export type Cloneable = string | number | boolean | null | undefined | { [key: string]: Cloneable } | { [key: number]: Cloneable } | { [key: symbol]: Cloneable } | Cloneable[];

export function deepClone<T extends Cloneable>(x: T): T {
	if (typeof x === 'object') {
		if (x === null) return x;
		if (Array.isArray(x)) return x.map(deepClone) as T;
		if (x instanceof Uint8Array) return new Uint8Array(x) as T;
		const obj = {} as Record<string | number | symbol, Cloneable>;
		for (const [k, v] of Object.entries(x)) {
			obj[k] = v === undefined ? undefined : deepClone(v);
		}
		return obj as T;
	} else {
		return x;
	}
}
