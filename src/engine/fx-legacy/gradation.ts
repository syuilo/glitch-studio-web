import { defineGpuFx } from '@/engine/fx-utils';
import shader from './gradation.glsl';

export default defineGpuFx({
	name: 'gradation',
	displayName: 'Gradation',
	category: 'draw',
	paramDefs: {
	},
	shader,
	setup: ({gl, params, shaderProgram }) => {
		
	},
});
