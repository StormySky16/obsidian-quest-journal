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
			/    - \[x\] Nested objective <!-- qj:id=[a-f0-9-]+ -->/,
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
			/    - \[ \] Incomplete child <!-- qj:id=[a-f0-9-]+ -->/,
		);
	});
});
