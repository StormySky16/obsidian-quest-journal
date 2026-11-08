import type { TFile } from 'obsidian';
import { parseQuest } from '../parsers/quest-parser';
import { validateObjectiveIds } from './objective-validation';
import { generateObjectiveId } from '../utils/ids';
import { Objective } from '../models/objective';

export interface ObjectiveMigrationResult {
	content: string;
	changed: boolean;
	errors: string[];
}

function matchesObjectiveSource(line: string, objective: Objective): boolean {
	const match = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);

	if (!match) {
		return false;
	}

	const indentation = (match[1] ?? '').replace(/\t/g, '    ').length;
	const completed = (match[2] ?? '').toLowerCase() === 'x';
	const text = (match[3] ?? '').trim();

	return (
		indentation === objective.depth &&
		completed === objective.completed &&
		text === objective.text
	);
}

export function migrateObjectiveIds(
	file: TFile,
	content: string,
	generateId: () => string = generateObjectiveId,
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

	const lines = content.split('\n');
	let changed = false;

	const usedIds = new Set<string>();

	const collectIds = (objectives: Objective[]): void => {
		for (const objective of objectives) {
			if (objective.id) {
				usedIds.add(objective.id);
			}

			collectIds(objective.children);
		}
	};

	collectIds(quest.objectives);

	const MAX_ID_ATTEMPTS = 10;
	const VALID_ID_PATTERN = /^[a-zA-Z0-9-]+$/;

	const generateUniqueId = (): string | null => {
		for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
			const id = generateId();

			if (!VALID_ID_PATTERN.test(id)){
				continue;
			}

			if (!usedIds.has(id)) {
				usedIds.add(id);
				return id;
			}
		}

		return null;
	};

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

				if (!matchesObjectiveSource(line, objective)) {
					errors.push(
						`Objective source mismatch at line ${objective.sourceLine}.`,
					);
					return;
				}

				const id = generateUniqueId();

				if (id === null) {
					errors.push(
						`Unable to generate a unique objective ID at line ${objective.sourceLine}.`,
					);
					return;
				}

				lines[index] = `${line} <!-- qj:id=${id} -->`;
				changed = true;
			}

			visit(objective.children);
		}
	};

	visit(quest.objectives);

	
	if (errors.length > 0) {
		return {
			content,
			changed: false,
			errors,
		};
	}

	return {
		content: changed ? lines.join('\n') : content,
		changed,
		errors: [],
	};
}
