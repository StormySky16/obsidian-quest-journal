import type { TFile, FrontMatterCache } from 'obsidian';
import type { Objective } from '../models/objective';
import { parseQuest } from '../parsers/quest-parser';
import { getQuestEditState } from './quest-edit-readiness';
import { validateObjectiveIds } from './objective-validation';

export interface ObjectiveCompletionResult {
	content: string;
	changed: boolean;
	error?: string;
}

export function setObjectiveCompletion(
	file: TFile,
	content: string,
	metadata: FrontMatterCache,
	objectiveId: string,
	completed: boolean,
): ObjectiveCompletionResult {
	const quest = parseQuest(file, content, metadata);
	const editState = getQuestEditState(quest);

	if (editState !== 'ready') {
		const validation = validateObjectiveIds(quest.objectives);

		let error: string;

		if (quest.objectiveParseIssues.length > 0) {
			error = 'Quest contains malformed objective IDs.';
		} else if (validation.duplicates.length > 0) {
			error = `Multiple objectives found with ID: ${validation.duplicates.join(', ')}`;
		} else {
			error = `${validation.missing} objectives are missing IDs.`;
		}

		return {
			content,
			changed: false,
			error,
		};
	}

	let target: Objective | undefined;

	const findObjective = (nodes: Objective[]): void => {
		for (const objective of nodes) {
			if (objective.id === objectiveId) {
				target = objective;
				return;
			}

			findObjective(objective.children);

			if (target) return;
		}
	};

	findObjective(quest.objectives);

	if (!target) {
		return {
			content,
			changed: false,
			error: `Objective ID not found: ${objectiveId}`,
		};
	}

	const lines = content.split(/\r?\n/);
	const lineIndex = target.sourceLine - 1;
	const originalLine = lines[lineIndex];

	if (!originalLine) {
		return {
			content,
			changed: false,
			error: `Objective source line not found: ${objectiveId}`,
		};
	}

	const updatedLine = originalLine.replace(
		/^(\s*[-*]\s+\[)[ xX](\])/,
		`$1${completed ? 'x' : ' '}$2`,
	);

	if (updatedLine === originalLine) {
		return {
			content,
			changed: false,
		};
	}

	lines[lineIndex] = updatedLine;

	return {
		content: lines.join(content.includes('\r\n') ? '\r\n' : '\n'),
		changed: true,
	};
}
