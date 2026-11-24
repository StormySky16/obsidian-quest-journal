import { App, TFile } from 'obsidian';
import { Quest, QuestStatus } from '../models/quest';
import { parseQuest } from '../parsers/quest-parser';
import { migrateObjectiveIds } from '../engine/objective-migration';
import { setObjectiveCompletion } from '../engine/objective-completion';

export async function loadQuests(app: App): Promise<Quest[]> {
	const files = app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith('Quests/'));

	return Promise.all(
		files.map(async (file) => {
			const content = await app.vault.cachedRead(file);
			const metadata =
				app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			return parseQuest(file, content, metadata);
		}),
	);
}

export async function migrateQuestObjectiveIds(
	app: App,
	file: TFile,
): Promise<boolean> {
	let changed = false;

	await app.vault.process(file, (content) => {
		const result = migrateObjectiveIds(file, content);

		if (result.errors.length > 0) {
			throw new Error(
				`Objective migration failed: ${result.errors.join('; ')}`,
			);
		}

		changed = result.changed;
		return result.content;
	});

	return changed;
}

export async function setQuestObjectiveCompletion(
	app: App,
	file: TFile,
	objectiveId: string,
	completed: boolean,
): Promise<boolean> {
	let changed = false;

	await app.vault.process(file, (content) => {
		const metadata =
			app.metadataCache.getFileCache(file)?.frontmatter ?? {};

		const result = setObjectiveCompletion(
			file,
			content,
			metadata,
			objectiveId,
			completed,
		);

		if (result.error) {
			throw new Error(`Objective completion failed: ${result.error}`);
		}

		changed = result.changed;
		return result.content;
	});

	return changed;
}

export async function seQuestStatus(
	app: App,
	file: TFile,
	status: QuestStatus,
): Promise<boolean> {
	let changed = false;

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		if (frontmatter.quest_status === status) return;

		frontmatter.quest_status = status;
		changed = true;

		if (status === 'completed') {
			frontmatter.quest_selected = false;
		}
	});

	return changed;
}
