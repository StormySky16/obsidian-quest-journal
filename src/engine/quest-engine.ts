import { Quest, QuestStatus } from '../models/quest';
import { countObjectives } from './objective-engine';

export type QuestDisplayStatus = QuestStatus | 'in-progress';

export function hasQuestProgress(quest: Quest): boolean {
	return countObjectives(quest.objectives).completed > 0;
}

export function getQuestDisplayStatus(quest: Quest): QuestDisplayStatus {
	if (quest.status !== 'available') {
		return quest.status;
	}

	return quest.selected || hasQuestProgress(quest)
		? 'in-progress'
		: 'available';
}
