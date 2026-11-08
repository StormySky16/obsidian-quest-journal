import { TFile } from 'obsidian';
import { Objective } from './objective';
import { ObjectiveParseIssue } from './objective-parse-issue';

export type QuestType = 'main' | 'side';
export type QuestStatus = 'selected' | 'available' | 'paused' | 'completed';

export interface Quest {
    file: TFile;
    title: string;
    type: QuestType;
    status: QuestStatus;
    description: string;
    objectives: Objective[];
    deadline?: string;
    notes: string;
	objectiveParseIssues: ObjectiveParseIssue[];
}

export interface QuestTag {
	id: string;
	name: string;
	color: string;
}
