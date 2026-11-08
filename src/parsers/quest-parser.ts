import { TFile, FrontMatterCache } from 'obsidian';
import { Objective } from '../models/objective';
import { Quest, QuestType, QuestStatus } from '../models/quest';
import { parseObjectives } from './objective-parser';

interface MarkdownSection {
	content: string;
	startLine: number;
}

function isQuestStatus(value: unknown): value is QuestStatus {
	return value === 'available' || value === 'paused' || value === 'completed';
}

export function parseQuest(
	file: TFile,
	content: string,
	metadata: FrontMatterCache,
): Quest {
	const type: QuestType = metadata.quest_type === 'side' ? 'side' : 'main';

	const rawStatus: unknown = metadata.quest_status;
	const legacySelected = rawStatus === 'selected';
	const status: QuestStatus = isQuestStatus(rawStatus)
		? rawStatus
		: 'available';
	const selected = legacySelected || metadata.quest_selected === true;

	const sections = extractSections(content);

	const objectiveSection= sections.get('objectives');
	const { objectives, issues } = parseObjectives(objectiveSection?.content ?? '');

	if (objectiveSection) {
		const offset = objectiveSection.startLine - 1;

		const applyOffset = (nodes: Objective[]): void => {
			for (const objective of nodes) {
				objective.sourceLine += offset;
				applyOffset(objective.children);
			}
		}

		applyOffset(objectives);

		for (const issue of issues) {
			issue.line += offset;
		}
	}

	return {
		file,
		title: file.basename,
		type,
		status,
		selected,
		description: sections.get('description')?.content.trim() ?? '',
		objectives,
		objectiveParseIssues: issues,
		deadline: metadata.deadline ? String(metadata.deadline) : undefined,
		notes: sections.get('notes')?.content.trim() ?? '',
	};
}

export function extractSections(content: string): Map<string, MarkdownSection> {
	const sections = new Map<string, MarkdownSection>();
	let current: string | null = null;
	let lines: string[] = [];
	let startLine = 0;

	const save = () => {
		if (current !== null)
			sections.set(current, { content: lines.join('\n'), startLine });
	};

	for (const [index, line] of content.split(/\r?\n/).entries()) {
		const heading = line.match(/^##\s+(.+)$/);

		if (heading) {
			save();
			current =
				heading[1] === undefined ? '' : heading[1].trim().toLowerCase();
			lines = [];
			startLine = index + 2; // +2 to account for 1-based line number and the heading line itself
		} else if (current) {
			lines.push(line);
		}
	}

	save();
	return sections;
}
