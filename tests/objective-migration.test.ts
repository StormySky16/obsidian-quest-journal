import { describe, it, expect } from 'vitest';
import type { TFile } from 'obsidian';
import { migrateObjectiveIds } from '../src/engine/objective-migration';

const file = {
	basename: 'Test Quest',
} as TFile;

describe('migrateObjectiveIds', () => {
	it('assigns IDs to objectives without IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] First objective',
			'    - [x] Nested objective',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.content).toMatch(
			/- \[ \] First objective <!-- qj:id=[a-f0-9-]+ -->/,
		);
		expect(result.content).toMatch(
			/ {4}- \[x\] Nested objective <!-- qj:id=[a-f0-9-]+ -->/,
		);
	});

	it('preserves existing IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] Existing <!-- qj:id=abc123 -->',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(false);
		expect(result.errors).toEqual([]);
		expect(result.content).toBe(content);
	});

	it('refuses to migrate malformed IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] Invalid <!-- qj:id=abc_123 -->',
			'- [ ] Missing ID',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.content).toBe(content);
	});

	it('refuses to migrate duplicate IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] First <!-- qj:id=duplicate -->',
			'- [ ] Second <!-- qj:id=duplicate -->',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.content).toBe(content);
	});

	it('preserves objective text and completion status when adding IDs', () => {
		const content = [
			'## Objectives',
			'- [x] Completed objective',
			'    - [ ] Incomplete child',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.content).toMatch(
			/- \[x\] Completed objective <!-- qj:id=[a-f0-9-]+ -->/,
		);
		expect(result.content).toMatch(
			/ {4}- \[ \] Incomplete child <!-- qj:id=[a-f0-9-]+ -->/,
		);
	});

	it('refuses migration when an ID comment is incomplete', () => {
		const content = [
			'## Objectives',
			'- [ ] Incomplete <!-- qj:id=abc123',
			'- [ ] Missing ID',
		].join('\n');

		const result = migrateObjectiveIds(file, content);

		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('retries when a generated ID collides with an existing ID', () => {
		const content = [
			'## Objectives',
			'- [ ] Existing <!-- qj:id=existing-id -->',
			'- [ ] Missing',
		].join('\n');

		const ids = ['existing-id', 'new-id'];
		let index = 0;

		const result = migrateObjectiveIds(file, content, () => ids[index++]!);

		expect(result.errors).toEqual([]);
		expect(result.changed).toBe(true);
		expect(result.content).toContain('- [ ] Missing <!-- qj:id=new-id -->');
		expect(index).toBe(2);
	});

	it('prevents collisions between newly generated IDs', () => {
		const content = ['## Objectives', '- [ ] First', '- [ ] Second'].join(
			'\n',
		);

		const ids = ['shared-id', 'shared-id', 'unique-id'];
		let index = 0;

		const result = migrateObjectiveIds(file, content, () => ids[index++]!);

		expect(result.errors).toEqual([]);
		expect(result.content).toContain(
			'- [ ] First <!-- qj:id=shared-id -->',
		);
		expect(result.content).toContain(
			'- [ ] Second <!-- qj:id=unique-id -->',
		);
		expect(index).toBe(3);
	});

	it('rejects migration when a unique ID cannot be generated', () => {
		const content = [
			'## Objectives',
			'- [ ] Existing <!-- qj:id=existing-id -->',
			'- [ ] Missing',
		].join('\n');

		const result = migrateObjectiveIds(file, content, () => 'existing-id');

		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
		expect(result.errors).toContain(
			'Unable to generate a unique objective ID at line 3.',
		);
	});

	it('retries when a generated ID has an invalid format', () => {
		const content = ['## Objectives', '- [ ] Missing ID'].join('\n');

		const ids = ['invalid_id', '', 'valid-id'];
		let index = 0;

		const result = migrateObjectiveIds(file, content, () => ids[index++]!);

		expect(result.errors).toEqual([]);
		expect(result.changed).toBe(true);
		expect(result.content).toContain(
			'- [ ] Missing ID <!-- qj:id=valid-id -->',
		);
		expect(index).toBe(3);
	});

	it('rejects migration when all generated IDs are invalid', () => {
		const content = ['## Objectives', '- [ ] Missing ID'].join('\n');

		const result = migrateObjectiveIds(file, content, () => 'invalid_id');

		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
		expect(result.errors).toContain(
			'Unable to generate a unique objective ID at line 2.',
		);
	});

	it('preserves CRLF line endings during migration', () => {
		const content = [
			'# Example Quest',
			'## Objectives',
			'- [ ] First',
			'- [x] Second',
			'## Notes',
			'Keep this unchanged.',
		].join('\r\n');

		const ids = ['first-id', 'second-id'];
		let index = 0;

		const result = migrateObjectiveIds(file, content, () => ids[index++]!);

		expect(result.errors).toEqual([]);
		expect(result.changed).toBe(true);

		expect(result.content).toContain(
			'- [ ] First <!-- qj:id=first-id -->\r\n',
		);

		expect(result.content).toContain(
			'- [x] Second <!-- qj:id=second-id -->\r\n',
		);

		expect(result.content).toContain('## Notes\r\nKeep this unchanged.');

		// Every newline should still be CRLF.
		expect(result.content.replace(/\r\n/g, '')).not.toContain('\n');
	});

	it('preserves trailing spaces when inserting an ID', () => {
		const content = ['## Objectives', '- [ ] Task   '].join('\n');

		const result = migrateObjectiveIds(file, content, () => 'test-id');

		expect(result.errors).toEqual([]);
		expect(result.content).toBe(
			'## Objectives\n- [ ] Task <!-- qj:id=test-id -->   ',
		);
	});

	it('preserves unrelated Markdown content', () => {
		const content = [
			'# Example Quest',
			'',
			'## Description',
			'Some **formatted** text.',
			'',
			'## Objectives',
			'- [ ] Task',
			'',
			'## Notes',
			'> An important note.',
		].join('\n');

		const result = migrateObjectiveIds(file, content, () => 'test-id');

		expect(result.errors).toEqual([]);
		expect(result.content).toBe(
			content.replace('- [ ] Task', '- [ ] Task <!-- qj:id=test-id -->'),
		);
	});

});
