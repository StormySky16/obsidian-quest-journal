import { describe, expect, it } from 'vitest';
import { countObjectives } from '../src/engine/objective-engine';
import type { Objective } from '../src/models/objective';

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

		expect(countObjectives(objectives)).toEqual({ completed: 2, total: 3 });
	});

	it('returns zero counts for an empty list', () => {
		expect(countObjectives([])).toEqual({ completed: 0, total: 0 });
	});
});
