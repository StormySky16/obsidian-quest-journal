import { describe, expect, it } from 'vitest';
import {
	getQuestDisplayStatus,
	hasQuestProgress,
} from '../src/engine/quest-engine';
import type { Quest } from '../src/models/quest';
import type { Objective } from '../src/models/objective';

const makeObjective = (
	completed: boolean,
	children: Objective[] = [],
): Objective => ({
	id: 'test_id',
	text: 'Test Objective',
	completed,
	depth: 0,
	children,
	sourceLine: 1,
});

const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
	file: {} as Quest['file'],
	title: 'Test Quest',
	type: 'main',
	status: 'available',
	selected: false,
	description: '',
	objectives: [],
	notes: '',
	objectiveParseIssues: [],
	...overrides,
});

describe('hasQuestProgress', () => {
	it('returns false for a quest without objectives', () => {
		expect(hasQuestProgress(makeQuest())).toBe(false);
	});

	it('returns false when all objectives are incomplete', () => {
		const quest = makeQuest({
			objectives: [makeObjective(false), makeObjective(false)],
		});

		expect(hasQuestProgress(quest)).toBe(false);
	});

	it('recognises manually completed objectives as progress', () => {
		const quest = makeQuest({
			objectives: [makeObjective(true), makeObjective(false)],
		});

		expect(hasQuestProgress(quest)).toBe(true);
	});

	it('recognises completed nested objectives as progress', () => {
		const quest = makeQuest({
			objectives: [
				makeObjective(false, [
					makeObjective(true),
					makeObjective(false),
				]),
			],
		});

		expect(hasQuestProgress(quest)).toBe(true);
	});

	it('recognises progress in automatically completed objective trees', () => {
		const parent = makeObjective(false, [
			makeObjective(true),
			makeObjective(true),
		]);

		const quest = makeQuest({
			objectives: [parent],
		});

		expect(hasQuestProgress(quest)).toBe(true);
		expect(parent.completed).toBe(false);
	});

	it('does not treat prioritisation alone as recorded progress', () => {
		const quest = makeQuest({
			selected: true,
		});

		expect(hasQuestProgress(quest)).toBe(false);
	});
});

describe('getQuestDisplayStatus', () => {
	it('displays available quests without objectives as available', () => {
		expect(getQuestDisplayStatus(makeQuest())).toBe('available');
	});

	it('displays unprioritised quests without progress as available', () => {
		const quest = makeQuest({
			objectives: [makeObjective(false)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('available');
	});

	it('displays prioritised available quests as in-progress', () => {
		const quest = makeQuest({
			selected: true,
			objectives: [makeObjective(false)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('in-progress');
	});

	it('displays available quests with partial progress as in-progress', () => {
		const quest = makeQuest({
			objectives: [makeObjective(false), makeObjective(true)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('in-progress');
	});

	it('does not automatically complete quests with all objectives complete', () => {
		const quest = makeQuest({
			objectives: [makeObjective(true), makeObjective(true)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('in-progress');
		expect(quest.status).toBe('available');
	});

	it('preserves paused status without progress', () => {
		const quest = makeQuest({
			status: 'paused',
		});

		expect(getQuestDisplayStatus(quest)).toBe('paused');
	});

	it('preserves paused status despite prioritisation and progress', () => {
		const quest = makeQuest({
			status: 'paused',
			selected: true,
			objectives: [makeObjective(true)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('paused');
	});

	it('preserves completed status with incomplete objectives', () => {
		const quest = makeQuest({
			status: 'completed',
			objectives: [makeObjective(false)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('completed');
	});

	it('preserves completed status despite prioritisation and progress', () => {
		const quest = makeQuest({
			status: 'completed',
			selected: true,
			objectives: [makeObjective(true), makeObjective(false)],
		});

		expect(getQuestDisplayStatus(quest)).toBe('completed');
	});

	it('returns to available when all recorded progress is undone', () => {
		const objective = makeObjective(true);
		const quest = makeQuest({
			objectives: [objective],
		});

		expect(getQuestDisplayStatus(quest)).toBe('in-progress');

		objective.completed = false;

		expect(getQuestDisplayStatus(quest)).toBe('available');
	});

	it('does not mutate the underlying quest state', () => {
		const quest = makeQuest({
			selected: true,
			objectives: [makeObjective(false, [makeObjective(true)])],
		});

		const original = structuredClone(quest);

		getQuestDisplayStatus(quest);

		expect(quest).toEqual(original);
	});
});
