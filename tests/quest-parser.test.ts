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
	});

	it('parses objectives and absolute source lines from CRLF content', () => {
		const file = {
			basename: 'Test Quest',
		} as TFile;
		const content = [
			'# Test Quest',
			'## Objectives',
			'- [ ] First',
			'- [x] Second',
		].join('\r\n');

		const quest = parseQuest(file, content, {});

		expect(quest.objectives).toHaveLength(2);
		expect(quest.objectives[0]?.sourceLine).toBe(3);
		expect(quest.objectives[1]?.sourceLine).toBe(4);
	});

	it('keeps selection separate from lifecycle status', () => {
		const file = {
			basename: 'Test Quest',
		} as TFile;

		const selectedQuest = parseQuest(file, '', {
			quest_status: 'paused',
			quest_selected: true,
		});
		const legacyQuest = parseQuest(file, '', {
			quest_status: 'selected',
		});

		expect(selectedQuest.status).toBe('paused');
		expect(selectedQuest.selected).toBe(true);
		expect(legacyQuest.status).toBe('available');
		expect(legacyQuest.selected).toBe(true);
	});

});
