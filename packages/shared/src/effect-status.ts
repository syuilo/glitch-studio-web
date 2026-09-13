export type EffectStatus =
	| { type: 'loading' }
	| { type: 'ready' }
	| { type: 'error'; message: string };
