import { describe, expect, it } from 'vitest';
import {
	countObjectives,
	isEffectivelyCompleted,
} from '../src/engine/objective-engine';
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

describe('countObjectives', () => {
	it('counts completed objectives recursively', () => {
		const objectives: Objective[] = [
			{
				text: 'Parent',
				completed: false,
				depth: 0,
				sourceLine: 1,
				children: [
					{
						text: 'Completed child',
						completed: true,
						depth: 4,
						sourceLine: 2,
						children: [],
					},
					{
						text: 'Incomplete child',
						completed: false,
						depth: 4,
						sourceLine: 2,
						children: [],
					},
				],
			},
			{
				text: 'Completed root',
				completed: true,
				depth: 0,
				sourceLine: 3,
				children: [],
			},
		];

		expect(countObjectives(objectives)).toEqual({ completed: 2, total: 4 });
	});

	it('returns zero counts for an empty list', () => {
		expect(countObjectives([])).toEqual({ completed: 0, total: 0 });
	});

	it('counts automatically completed parents', () => {
		const objectives = [
			makeObjective(false, [makeObjective(true), makeObjective(true)]),
		];

		expect(countObjectives(objectives)).toEqual({ completed: 3, total: 3 });
	});

	it('does not count incomplete automatic parents', () => {
		const objectives = [
			makeObjective(false, [makeObjective(true), makeObjective(false)]),
		];

		expect(countObjectives(objectives)).toEqual({ completed: 1, total: 3 });
	});

	it('counts manual parent completion without completing children', () => {
		const objectives = [
			makeObjective(true, [makeObjective(false), makeObjective(false)]),
		];

		expect(countObjectives(objectives)).toEqual({ completed: 1, total: 3 });
	});
});

describe('isEffectivelyCompleted', () => {
	it('keeps incomplete leaf objectives incomplete', () => {
		expect(isEffectivelyCompleted(makeObjective(false))).toBe(false);
	});

	it('recognises manually completed objectives', () => {
		expect(isEffectivelyCompleted(makeObjective(true))).toBe(true);
	});

	it('automatically completes a parent when all children are complete', () => {
		const parent = makeObjective(false, [
			makeObjective(true),
			makeObjective(true),
		]);
		expect(isEffectivelyCompleted(parent)).toBe(true);
		expect(parent.completed).toBe(false);
	});

	it('does not complete a parent with incomplete children', () => {
		const parent = makeObjective(false, [
			makeObjective(true),
			makeObjective(false),
		]);

		expect(isEffectivelyCompleted(parent)).toBe(false);
	});

	it('preserves manual parent completion with incomplete children', () => {
		const parent = makeObjective(true, [
			makeObjective(true),
			makeObjective(false),
		]);

		expect(isEffectivelyCompleted(parent)).toBe(true);
		expect(parent.children[1]?.completed).toBe(false);
	});

	it('propagates automatic completion through multiple levels', () => {
		const grandparent = makeObjective(false, [
			makeObjective(false, [makeObjective(true), makeObjective(true)]),
			makeObjective(false, [makeObjective(true), makeObjective(true)]),
		]);

		expect(isEffectivelyCompleted(grandparent)).toBe(true);
		expect(isEffectivelyCompleted(grandparent.children[0]!)).toBe(true);
		expect(isEffectivelyCompleted(grandparent.children[1]!)).toBe(true);
	});
});
