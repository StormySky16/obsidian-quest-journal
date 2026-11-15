import { Objective } from '../models/objective';

export function countObjectives(objectives: Objective[]): {
	completed: number;
	total: number;
} {
	let completed = 0;
	let total = 0;

	for (const objective of objectives) {
		total++;

		if (isEffectivelyCompleted(objective)) completed++;

		const childCounts = countObjectives(objective.children);

		completed += childCounts.completed;
		total += childCounts.total;
	}

	return { completed, total };
}

export function isEffectivelyCompleted(objective: Objective): boolean {
	if (objective.completed) {
		return true;
	}

	if (objective.children.length === 0) {
		return false;
	}

	return objective.children.every(isEffectivelyCompleted);
}
