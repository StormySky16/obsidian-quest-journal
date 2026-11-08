import { describe, expect, it } from 'vitest';
import { validateObjectiveIds } from '../src/engine/objective-validation';
import type { Objective } from '../src/models/objective';

function objective(
	id: string | undefined,
	children: Objective[] = [],
): Objective {
	return {
		id,
		text: id ?? 'Missing ID',
		completed: false,
		depth: 0,
		sourceLine: 1,
		children,
	};
}

describe('validateObjectiveIds', () => {
	it('finds missing and duplicate IDs recursively', () => {
		const result = validateObjectiveIds([
			objective('shared', [objective(undefined)]),
			objective('shared'),
		]);

		expect(result).toEqual({
			missing: 1,
			duplicates: ['shared'],
			valid: false,
		});
	});

	it('accepts a tree with unique IDs', () => {
		const result = validateObjectiveIds([
			objective('parent', [objective('child')]),
		]);

		expect(result).toEqual({
			missing: 0,
			duplicates: [],
			valid: true,
		});
	});
});
