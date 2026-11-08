import { describe, it, expect } from 'vitest';
import { parseQuest } from '../src/parsers/quest-parser';
import type { TFile } from 'obsidian';

describe('parseQuest', () => {
	it('preserves objective parsing issues', () => {
		const file = {
			basename: 'Test Quest',
		} as TFile;

		const content = [
			'## Objectives',
			'- [ ] Update resume <!-- qj:id=abc_123 -->',
		].join('\n');

		const quest = parseQuest(file, content, {});

		expect(quest.objectiveParseIssues).toEqual([
			{
				type: 'malformed-id',
				line: 2,
				rawId: 'abc_123',
			},
		]);
	})

	it('returns no parsing issues for valid IDs', () => {
		const file = {
			basename: 'Test Quest',
		} as TFile;

		const content = [
			'## Objectives',
			'- [ ] Update resume <!-- qj:id=abc123 -->',
		].join('\n');

		const quest = parseQuest(file, content, {});
		expect(quest.objectiveParseIssues).toEqual([]);
	})

	it('converts parsing issue lines to absolute file lines', () => {
		const file = {
			basename: 'Test Quest',
		} as TFile;

		const content = [
			'## Description',
			'A test quest.',
			'',
			'## Objectives',
			'- [ ] Invalid <!-- qj:id=abc_123 -->',
		].join('\n');

		const quest = parseQuest(file, content, {});

		expect(quest.objectiveParseIssues).toEqual([
			{
				type: 'malformed-id',
				line: 5,
				rawId: 'abc_123',
			},
		]);
	})
})
