import type { Objective } from '../models/objective';

export interface ObjectiveValidationResult {
	missing: number;
	duplicates: string[];
	valid: boolean;
}

export function validateObjectiveIds(objectives: Objective[]): ObjectiveValidationResult {
	let missing = 0;
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	function visit(nodes: Objective[]): void {
		for (const objective of nodes) {
			if (!objective.id) {
				missing++;
			} else if (seen.has(objective.id)) {
				duplicates.add(objective.id);
			} else {
				seen.add(objective.id);
			}

			visit(objective.children);
		}
	}

	visit(objectives);

	return {
		missing,
		duplicates: [...duplicates],
		valid: missing === 0 && duplicates.size === 0,
	};
}
