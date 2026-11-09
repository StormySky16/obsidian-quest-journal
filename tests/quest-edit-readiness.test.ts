import { describe, expect, it } from 'vitest';
import type { Quest } from '../src/models/quest';
import type { Objective } from '../src/models/objective';
import { getQuestEditState } from '../src/engine/quest-edit-readiness';

function makeObjective(id?: string): Objective {
	return {
		id,
		text: 'Test Objective',
		completed: false,
		depth: 0,
		children: [],
		sourceLine: 1,
	};
}

function makeQuest(
	objectives: Objective[],
	objectiveParseIssues: Quest['objectiveParseIssues'] = [],
): Quest {
	return {
		objectives,
		objectiveParseIssues,
	} as Quest;
}

describe('getQuestEditState', () => {
	it('returns ready when all objectives have unique IDs', () => {
		const quest = makeQuest([
			makeObjective('fist-id'),
			makeObjective('second-id'),
		]);

		expect(getQuestEditState(quest)).toBe('ready');
	});

	it('requires migration when an objective has no ID', () => {
		const quest = makeQuest([makeObjective('first-id'), makeObjective()]);

		expect(getQuestEditState(quest)).toBe('migration-required');
	});

	it('blocks editing when duplicate IDs exist', () => {
		const quest = makeQuest([
			makeObjective('duplicate-id'),
			makeObjective('duplicate-id'),
		]);

		expect(getQuestEditState(quest)).toBe('blocked');
	});

	it('blocks editing when parsing reported malformed IDs', () => {
		const quest = makeQuest(
			[makeObjective()],
			[{ type: 'malformed-id', line: 3, rawId: 'bad_id' }],
		);

		expect(getQuestEditState(quest)).toBe('blocked');
	});

	it('requires migration when a child objective of a valid parent has no ID', () => {
		const parent = makeObjective('parent-id');
		parent.children = [makeObjective()];

		const quest = makeQuest([parent]);

		expect(getQuestEditState(quest)).toBe('migration-required');
	});

	it('returns ready when quest contains no objectives', () => {
		const quest = makeQuest([]);

		expect(getQuestEditState(quest)).toBe('ready');
	});
});
