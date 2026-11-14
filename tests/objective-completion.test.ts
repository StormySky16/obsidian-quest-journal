import { describe, expect, it } from 'vitest';
import { setObjectiveCompletion } from '../src/engine/objective-completion';

describe('setObjectiveCompletion', () => {
	it('marks the matching objective as completed', () => {
		const content = [
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=def456 -->',
		].join('\n');

		const result = setObjectiveCompletion(content, 'abc123', true);

		expect(result.error).toBeUndefined();
		expect(result.changed).toBe(true);
		expect(result.content).toBe(
			[
				'- [x] First <!-- qj:id=abc123 -->',
				'- [ ] Second <!-- qj:id=def456 -->',
			].join('\n'),
		);
	});

	it('can mark a completed objective as incomplete', () => {
		const content = '- [x] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(content, 'abc123', false);

		expect(result.content).toBe('- [ ] Task <!-- qj:id=abc123 -->');
	});

	it('does not change an objective already in the requested state', () => {
		const content = '- [x] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(content, 'abc123', true);

		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('rejects an unknown objective ID', () => {
		const content = '- [ ] Task <!-- qj:id=abc123 -->';

		const result = setObjectiveCompletion(content, 'def456', true);

		expect(result.error).toBe('Objective ID not found: def456');
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('rejects duplicate objective IDs', () => {
		const content = [
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=abc123 -->',
		].join('\n');

		const result = setObjectiveCompletion(content, 'abc123', true);

		expect(result.error).toBe('Multiple objectives found with ID: abc123');
		expect(result.changed).toBe(false);
		expect(result.content).toBe(content);
	});

	it('preserves nested indentation', () => {
		const content = [
			'- [ ] Parent <!-- qj:id=parent -->',
			'  - [ ] Child  <!-- qj:id=child -->',
		].join('\n');

		const result = setObjectiveCompletion(content, 'child', true);

		expect(result.content).toContain('  - [x] Child  <!-- qj:id=child -->');
	});

	it('preserves CRLF line endings', () => {
		const content = [
			'- [ ] First <!-- qj:id=abc123 -->',
			'- [ ] Second <!-- qj:id=def456 -->',
		].join('\r\n');

		const result = setObjectiveCompletion(content, 'abc123', true);

		expect(result.content).toBe(
			[
				'- [x] First <!-- qj:id=abc123 -->',
				'- [ ] Second <!-- qj:id=def456 -->',
			].join('\r\n'),
		);
	});
});
