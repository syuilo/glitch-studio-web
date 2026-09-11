import definition from '../fx-definitions/audioSpectrogram.ts';
import type { GetEffectOptionsSchemaValues } from '../fx-definition.ts';

export type AudioSpectrogramOptions = Omit<GetEffectOptionsSchemaValues<typeof definition.paramDefs>, 'player'> & {
	// nullはプロジェクト全体のミックス。IDを指定するとPlayerの音量調整前を表示する。
	player: string | null;
};

export function audioSpectrogramDefaults(): AudioSpectrogramOptions {
	return Object.fromEntries(Object.entries(definition.getDefaultParams()).map(([key, param]) => {
		if (param.type !== 'literal') throw new Error(`Expected literal default: ${key}`);
		return [key, param.value];
	})) as AudioSpectrogramOptions;
}
