import { describe, expect, it, vi } from 'vitest';
import type { App, TFile } from 'obsidian';
import {
	migrateQuestObjectiveIds,
	setQuestObjectiveCompletion,
} from '../src/services/quest-repository';

describe('migrateQuestObjectiveIds', () => {
	it('persists missing objective IDs', async () => {
		const file = {
			path: 'Quests/example.md',
			basename: 'example',
		} as TFile;

		let savedContent = [
			'# Example Quest',
			'## Objectives',
			'- [ ] First objective',
		].join('\n');

		const process = vi.fn(
			async (_file: TFile, callback: (content: string) => string) => {
				savedContent = callback(savedContent);
			},
		);

		const app = {
			vault: { process },
		} as unknown as App;

		const changed = await migrateQuestObjectiveIds(app, file);

		expect(changed).toBe(true);
		expect(process).toHaveBeenCalledOnce();
		expect(savedContent).toMatch(
			/- \[ \] First objective <!-- qj:id=[a-zA-Z0-9-]+ -->/,
		);
	});

	it('rejects malformed objective IDs without modifying the file', async () => {
		const file = {
			path: 'Quests/example.md',
			basename: 'example',
		} as TFile;

		const originalContent = [
			'# Example Quest',
			'## Objectives',
			'- [ ] Valid objective',
			'- [ ] Invalid objective <!-- qj:id=bad_id -->',
		].join('\n');

		let savedContent = originalContent;

		const process = vi.fn(
			async (_file: TFile, callback: (content: string) => string) => {
				savedContent = callback(savedContent);
			},
		);

		const app = {
			vault: { process },
		} as unknown as App;

		await expect(migrateQuestObjectiveIds(app, file)).rejects.toThrow(
			'Objective migration failed',
		);

		expect(process).toHaveBeenCalledOnce();
		expect(savedContent).toBe(originalContent);
	});

	it('reports no changes when all objectives already have IDs', async () => {
		const file = {
			path: 'Quests/example.md',
			basename: 'example',
		} as TFile;

		const originalContent = [
			'# Example Quest',
			'## Objectives',
			'- [ ] First objective <!-- qj:id=first-id -->',
			'- [x] Second objective <!-- qj:id=second-id -->',
		].join('\n');

		let savedContent = originalContent;

		const process = vi.fn(
			async (_file: TFile, callback: (content: string) => string) => {
				savedContent = callback(savedContent);
			},
		);

		const app = {
			vault: { process },
		} as unknown as App;

		const changed = await migrateQuestObjectiveIds(app, file);

		expect(changed).toBe(false);
		expect(process).toHaveBeenCalledOnce();
		expect(savedContent).toBe(originalContent);
	});
});

describe('setQuestObjectiveCompletion', () => {
	const file = {
		path: 'Quests/example.md',
		basename: 'example',
	} as TFile;

	function createApp(initialContent: string) {
		let savedContent = initialContent;

		const process = vi.fn(
			async (_file: TFile, callback: (content: string) => string) => {
				savedContent = callback(savedContent);
			},
		);

		const app = {
			vault: { process },
			metadataCache: {
				getFileCache: vi.fn(() => ({
					frontmatter: {
						quest_type: 'side',
						quest_status: 'available',
					},
				})),
			},
		} as unknown as App;

		return {
			app,
			process,
			getSavedContent: () => savedContent,
			setSavedContent: (content: string) => {
				savedContent = content;
			},
		};
	}

	it('persists a completion change', async () => {
		const original = [
			'## Objectives',
			'- [ ] First objective <!-- qj:id=abc123 -->',
			'- [ ] Second objective <!-- qj:id=def456 -->',
		].join('\n');

		const context = createApp(original);

		const changed = await setQuestObjectiveCompletion(
			context.app,
			file,
			'abc123',
			true,
		);

		expect(changed).toBe(true);
		expect(context.process).toHaveBeenCalledOnce();
		expect(context.getSavedContent()).toBe(
			[
				'## Objectives',
				'- [x] First objective <!-- qj:id=abc123 -->',
				'- [ ] Second objective <!-- qj:id=def456 -->',
			].join('\n'),
		);
	});

	it('does not change an already completed objective', async () => {
		const original =
			'## Objectives\n- [x] Completed objective <!-- qj:id=abc123 -->';

		const context = createApp(original);

		const changed = await setQuestObjectiveCompletion(
			context.app,
			file,
			'abc123',
			true,
		);

		expect(changed).toBe(false);
		expect(context.getSavedContent()).toBe(original);
	});

	it('rejects invalid objective IDs without saving changes', async () => {
		const original = [
			'## Objectives',
			'- [ ] First objective <!-- qj:id=abc123 -->',
			'- [ ] Second objective <!-- qj:id=def_456 -->',
		].join('\n');

		const context = createApp(original);

		await expect(
			setQuestObjectiveCompletion(context.app, file, 'abc123', true),
		).rejects.toThrow('Objective completion failed');

		expect(context.getSavedContent()).toBe(original);
	});

	it('validates the latest content during processing', async () => {
		const original =
			'## Objectives\n- [ ] First objective <!-- qj:id=abc123 -->';

		const newerContent = [
			'## Objectives',
			'- [ ] First objective <!-- qj:id=abc123 -->',
			'- [ ] New objective',
		].join('\n');

		// The journal initially loads a valid quest
		const context = createApp(original);

		// Simulate an external edit before the checkbox operation
		context.setSavedContent(newerContent);

		// Attempt to complete previously valid objective
		await expect(
			setQuestObjectiveCompletion(context.app, file, 'abc123', true),
		).rejects.toThrow('1 objectives are missing IDs');

		// The repository must not overwrite the newer file
		expect(context.getSavedContent()).toBe(newerContent);
		expect(context.process).toHaveBeenCalledOnce();
	});
});
