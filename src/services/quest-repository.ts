import { App, TFile } from 'obsidian'
import { Quest } from '../models/quest';
import { parseQuest } from '../parsers/quest-parser';
import { migrateObjectiveIds } from '../engine/objective-migration';


export async function loadQuests(app: App): Promise<Quest[]> {
	const files = app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith('Quests/'));

	return Promise.all(
        files.map(async (file) => {
            const content = await app.vault.cachedRead(file)
            const metadata =  app.metadataCache.getFileCache(file)?.frontmatter ?? {};
            return parseQuest(file, content, metadata);
        })
    );
}


export async function migrateQuestObjectiveIds(
	app: App,
	file: TFile
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
	})

	return changed;
}

