import type { TFile } from 'obsidian';
import { parseQuest } from '../parsers/quest-parser';
import { validateObjectiveIds } from './objective-validation';
import { generateObjectiveId } from '../utils/ids';

export interface ObjectiveMigrationResult {
	content: string;
	changed: boolean;
	errors: string[];
}

export function migrateObjectiveIds(
	file: TFile,
	content: string,
): ObjectiveMigrationResult {
	const quest = parseQuest(file, content, {});
	const validation = validateObjectiveIds(quest.objectives);

	const errors: string[] = [];

	if (quest.objectiveParseIssues.length > 0) {
		errors.push('Malformed objective ID comments detected.');
	}

	if (validation.duplicates.length > 0) {
		errors.push(
			`Duplicate objective IDs detected: ${validation.duplicates.join(', ')}`,
		);
	}

	if (errors.length > 0) {
		return {
			content,
			changed: false,
			errors,
		};
	}

	const lines = content.split('\n');
	let changed = false;

	const visit = (objectives: typeof quest.objectives): void => {
		for (const objective of objectives) {
			if (!objective.id) {
				const index = objective.sourceLine - 1;
				const line = lines[index];

				if (line === undefined) {
					errors.push(
						`Objective source line ${objective.sourceLine} not found.`,
					);
					return;
				}

				lines[index] =
					`${line} <!-- qj:id=${generateObjectiveId()} -->`;

				changed = true;
			}

			visit(objective.children);
		}
	};

	visit(quest.objectives);

	return {
		content: changed ? lines.join('\n') : content,
		changed,
		errors: [],
	};
}
