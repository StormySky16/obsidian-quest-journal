import { describe, expect, it } from 'vitest';
import { validateObjectiveIds } from '../src/engine/objective-validation';
import type { Objective } from '../src/models/objective';

function makeObjective(
	id?: string,
	children: Objective[] = [],
): Objective {
	return {
		id,
		text: "Test Objective",
		completed: false,
		depth: 0,
		children,
	};
}

describe('validateObjectiveIds', () => {
	it('accepts unique IDs', () => {
		const objectives = [
			makeObjective('abc123'),
			makeObjective('def456'),
		];

		expect(validateObjectiveIds(objectives)).toEqual({
			missing: 0,
			duplicates: [],
			valid: true,
		});
	})

	it('detects missing IDs', () => {
		const objectives = [
			makeObjective('abc123'),
			makeObjective(),
		];

		expect(validateObjectiveIds(objectives)).toEqual({
			missing: 1,
			duplicates: [],
			valid: false,
		});
	})

	it('detects duplicate IDs across nested objectives', () => {
		const objectives = [
			makeObjective('abc123', [
				makeObjective('def456'),
				makeObjective('abc123'),
			]),
		];

		expect(validateObjectiveIds(objectives)).toEqual({
			missing: 0,
			duplicates: ['abc123'],
			valid: false,
		});
	})

	it('accepts an empty objective list', () => {
		expect(validateObjectiveIds([])).toEqual({
			missing: 0,
			duplicates: [],
			valid: true,
		});
	})
});
