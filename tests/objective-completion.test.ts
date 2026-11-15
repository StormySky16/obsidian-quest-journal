import { describe, expect, it } from 'vitest';
import type { TFile, FrontMatterCache } from 'obsidian';
import { setObjectiveCompletion } from '../src/engine/objective-completion';

const file = {
	basename: 'Test Quest',
} as TFile;

const metadata = {
	quest_type: 'side',
	quest_status: 'available',
} as FrontMatterCache;

describe('setObjectiveCompletion', () => {
	it('marks the matching objective as completed', () => {
		const content = [
			'## Objectives',
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=def456 -->',
		].join('\n');

		const result = setObjectiveCompletion(
			file,
			content,
			metadata,
			'abc123',
			true,
		);

		expect(result.error).toBeUndefined();
		expect(result.changed).toBe(true);
		expect(result.content).toBe(
			[
				'## Objectives',
				'- [x] First <!-- qj:id=abc123 -->',
				'- [ ] Second <!-- qj:id=def456 -->',
			].join('\n'),
		);
	});

	it('can mark a completed objective as incomplete', () => {
		const content = '## Objectives\n- [x] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(file, content, metadata, 'abc123', false);

		expect(result.content).toBe('## Objectives\n- [ ] Task <!-- qj:id=abc123 -->');
	});

	it('does not change an objective already in the requested state', () => {
		const content = '## Objectives\n- [x] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(file, content, metadata, 'abc123', true);

		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('rejects an unknown objective ID', () => {
		const content = '## Objectives\n- [ ] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(file, content, metadata, 'def456', true);

		expect(result.error).toBe('Objective ID not found: def456');
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('rejects duplicate objective IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=abc123 -->',
		].join('\n');

		const result = setObjectiveCompletion(file, content, metadata, 'abc123', true);

		expect(result.error).toBe('Multiple objectives found with ID: abc123');
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('preserves nested indentation', () => {
		const content = [
			'## Objectives',
			'- [ ] Parent <!-- qj:id=parent -->',
			'  - [ ] Child  <!-- qj:id=child -->',
		].join('\n');

		const result = setObjectiveCompletion(file, content, metadata, 'child', true);

		expect(result.content).toContain('  - [x] Child  <!-- qj:id=child -->');
	});

	it('preserves CRLF line endings', () => {
		const content = [
			'## Objectives',
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=def456 -->',
		].join('\r\n');

		const result = setObjectiveCompletion(file, content, metadata, 'abc123', true);

		expect(result.content).toBe(
			[
				'## Objectives',
				'- [x] First <!-- qj:id=abc123 -->',
				'- [ ] Second <!-- qj:id=def456 -->',
			].join('\r\n'),
		);
	});

	it('does not modify checkboxes outside the Objectives section', () => {
		const content = [
			'## Objectives',
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=def456 -->',
			'## Notes',
			'- [ ] Unrelated Task <!-- qj:id=ghi789 -->',
		].join('\n');

		const result = setObjectiveCompletion(file, content, metadata, 'ghi789', true);

		expect(result.error).toBeDefined();
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('rejects editing a quest with malformed objective IDs', () => {
		const content = [
			'## Objectives',
			'- [ ] Valid Objective <!-- qj:id=abc123 -->',
			'- [ ] Invalid Objective <!-- qj:id=def_456 -->',
		].join('\n');

		const result = setObjectiveCompletion(file, content, metadata, 'abc123', true);

		expect(result.error).toBe('Quest contains malformed objective IDs.');
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	})
});
