export type WorkspacePanel = {
	id: string;
	ratio: number;
	type: string;
	active?: boolean;
};

export type WorkspaceDivider = {
	id: string;
	ratio: number;
	type: null;
	direction: 'horizontal' | 'vertical';
	children: (WorkspaceDivider | WorkspacePanel)[];
};
