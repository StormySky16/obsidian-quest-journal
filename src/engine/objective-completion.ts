export interface ObjectiveCompletionResult {
	content: string;
	changed: boolean;
	error?: string;
}

export function setObjectiveCompletion(
	content: string,
	objectiveId: string,
	completed: boolean,
): ObjectiveCompletionResult {
	const lines = content.split(/\r?\n/);

	const escapedId = objectiveId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	const idPattern = new RegExp(`<!--\\s*qj:id=${escapedId}\\s*-->\\s*$`);

	const matches: number[] = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];

		if (
			line &&
			/^(\s*)[-*]\s+\[([ xX])\]\s+/.test(line) &&
			idPattern.test(line)
		) {
			matches.push(index);
		}
	}

	if (matches.length !== 1) {
		return {
			content,
			changed: false,
			error:
				matches.length === 0
					? `Objective ID not found: ${objectiveId}`
					: `Multiple objectives found with ID: ${objectiveId}`,
		};
	}

	const index = matches[0]!;
	const originalLine = lines[index]!;

	const updatedLine = originalLine.replace(
		/^(\s*[-*]\s+\[)[ xX](\])/,
		`$1${completed ? 'x' : ' '}$2`,
	);

	if (updatedLine === originalLine) {
		return {
			content,
			changed: false,
		};
	}

	lines[index] = updatedLine;

	return {
		content: lines.join(content.includes('\r\n') ? '\r\n' : '\n'),
		changed: true,
	};
}
