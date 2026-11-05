import { App } from 'obsidian'
import { Quest } from '../models/quest';
import { parseQuest } from '../parsers/quest-parser';


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
