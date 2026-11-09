import { describe, expect, it, vi} from 'vitest';
import type { App, TFile } from 'obsidian';
import { migrateQuestObjectiveIds } from '../src/services/quest-repository';

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
})
