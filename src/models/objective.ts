export interface Objective {
    id?: string;
    text: string;
    completed: boolean;
    depth: number;
    children: Objective[];
	sourceLine: number;
}
