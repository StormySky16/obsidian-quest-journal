import { describe, expect, it } from 'vitest';
import { parseObjectives } from '../src/parsers/objective-parser';

// export interface Objective {
// 	id?: string;
// 	text: string;
// 	completed: boolean;
// 	depth: number;
// 	children: Objective[]
// 	sourceLine: number;
// }

describe('parseObjectives', () => {
	it('parses objectives with valid IDs', () => {
		const markdown = '- [ ] Update resume <!-- qj:id=abc123 -->';

		const result = parseObjectives(markdown);

		expect(result.objectives[0]?.id).toBe('abc123');
		expect(result.objectives[0]?.text).toBe('Update resume');
		expect(result.objectives[0]?.completed).toBe(false);
		expect(result.objectives[0]?.depth).toBe(0);
		expect(result.objectives[0]?.children).toEqual([]);
		expect(result.objectives[0]?.sourceLine).toBe(1);
		expect(result.issues).toEqual([]);
	});

	it('reports malformed objective IDs', () => {
		const markdown = '- [ ] Update resume <!-- qj:id=abc_123 -->';

		const result = parseObjectives(markdown);

		expect(result.issues).toEqual([
			{
				type: 'malformed-id',
				line: 1,
				rawId: 'abc_123',
			},
		]);
	});

	it('preserves nested objectives', () => {
		const markdown = [
			'- [ ] Parent <!-- qj:id=parent1 -->',
			'    - [ ] Child <!-- qj:id=child1 -->',
		].join('\n');

		const result = parseObjectives(markdown);

		expect(result.objectives).toHaveLength(1);
		expect(result.objectives[0]?.children).toHaveLength(1);
		expect(result.objectives[0]?.children[0]?.id).toBe('child1');
		expect(result.issues).toEqual([]);
	});

	it('tracks source lines for nested objectives', () => {
		const markdown = [
			'- [ ] Parent <!-- qj:id=parent1 -->',
			'',
			'    - [ ] Child <!-- qj:id=child1 -->',
		].join('\n');

		const { objectives } = parseObjectives(markdown);

		expect(objectives[0]?.sourceLine).toBe(1);
		expect(objectives[0]?.children[0]?.sourceLine).toBe(3);
	});
});
