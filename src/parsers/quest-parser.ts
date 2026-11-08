import { TFile, FrontMatterCache } from 'obsidian';
import { Quest, QuestType, QuestStatus } from '../models/quest';
import { parseObjectives } from './objective-parser';

export function parseQuest(file: TFile, content: string, metadata: FrontMatterCache): Quest {
	const type: QuestType = metadata.quest_type === 'side' ? 'side' : 'main';

	const validStatuses: QuestStatus[] = [
		'selected',
		'available',
		'paused',
		'completed',
	];

	const status: QuestStatus = validStatuses.includes(metadata.quest_status)
		? metadata.quest_status
		: 'available';

	const sections = extractSections(content);

	const objectiveText = sections.get('objectives') ?? '';
	const {objectives, issues} = parseObjectives(objectiveText);

	return {
		file,
		title: file.basename,
		type,
		status,
		description: sections.get('description')?.trim() ?? '',
		objectives,
		objectiveParseIssues: issues,
		deadline: metadata.deadline ? String(metadata.deadline) : undefined,
		notes: sections.get('notes')?.trim() ?? '',
	};
}

function extractSections(content: string): Map<string, string> {
	const sections = new Map<string, string>();
	let current: string | null = null;
	let lines: string[] = [];

	const save = () => {
		if (current) sections.set(current, lines.join('\n').trim());
	};

	for (const line of content.split('\n')) {
		const heading = line.match(/^##\s+(.+)$/);

		if (heading) {
			save();
			current =
				heading[1] === undefined ? '' : heading[1].trim().toLowerCase();
			lines = [];
		} else if (current) {
			lines.push(line);
		}
	}

	save();
	return sections;
}
