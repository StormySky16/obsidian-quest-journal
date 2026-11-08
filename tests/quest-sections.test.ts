import { describe, it, expect } from 'vitest';
import { extractSections } from '../src/parsers/quest-parser';

describe('extractSections', () => {
	it('preserves section content and absolute positions', () => {
		const markdown = [
			'---',
			'quest_type: main',
			'---',
			'',
			'## Description',
			'A test quest.',
			'',
			'## Objectives',
			'',
			'- [ ] First objective',
			'    - [ ] Nested objective',
		].join('\n');

		const sections = extractSections(markdown);

		expect(sections.get('description')).toEqual({
			content: 'A test quest.\n',
			startLine: 6,
		});

		expect(sections.get('objectives')).toEqual({
			content: '\n- [ ] First objective\n    - [ ] Nested objective',
			startLine: 9,
		});
	});

	it('handles sections without content', () => {
		const markdown = ['## Objectives', '## Notes', 'Some notes.'].join(
			'\n',
		);

		const sections = extractSections(markdown);

		expect(sections.get('objectives')).toEqual({
			content: '',
			startLine: 2,
		});
	});
});
