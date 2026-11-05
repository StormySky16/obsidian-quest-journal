import { TFile } from 'obsidian';
import { Objective } from './objective';

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
}

export interface QuestTag {
	id: string;
	name: string;
	color: string;
}