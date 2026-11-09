import { Quest } from '../models/quest';
import { validateObjectiveIds } from './objective-validation';
export type QuestEditState = 'ready' | 'migration-required' | 'blocked';

export function getQuestEditState(quest: Quest): QuestEditState {
	const validation = validateObjectiveIds(quest.objectives);

	if (
		quest.objectiveParseIssues.length > 0 ||
		validation.duplicates.length > 0
	) {
		return 'blocked';
	}

	if (validation.missing > 0) {
		return 'migration-required';
	}

	return 'ready';
}
