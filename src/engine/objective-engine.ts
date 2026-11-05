import { Objective } from '../models/objective';

export function countObjectives(objectives: Objective[]): {
        completed: number;
        total: number;
    } {
        let completed = 0;
        let total = 0;

        for (const objective of objectives) {
            total++;

            if (objective.completed) completed++;

            const childCounts = countObjectives(objective.children);

            completed += childCounts.completed;
            total += childCounts.total;
        }

        return { completed, total };
    }
