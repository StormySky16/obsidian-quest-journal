import { Objective } from "../models/objective"
import { ObjectiveParseIssue } from "../models/objective-parse-issue"

export interface ObjectiveParseResult {
	objectives: Objective[];
	issues: ObjectiveParseIssue[];
}

export function parseObjectives(objectiveText: string): ObjectiveParseResult {
        const roots: Objective[] = [];
        const stack: Objective[] = [];
		const issues: ObjectiveParseIssue[] = [];

        const idPattern = /\s+<!--\s*qj:id=([a-zA-Z0-9-]+)\s*-->\s*$/;

        for (const [index, line] of objectiveText.split('\n').entries()) {
            const match = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);

            if (!match) continue;

            const indentation = (match[1] ?? '').replace(/\t/g, '    ').length;

            const rawText = (match[3] ?? '').trim();
            const idMatch = rawText.match(idPattern);

			const malformedIdPattern = /<!--\s*qj:id\s*=\s*(.*?)\s*-->/g;

			for (const malformedMatch of rawText.matchAll(malformedIdPattern)) {
				if (idMatch && malformedMatch[0] === idMatch[0].trim()) continue;

				issues.push({
					type: 'malformed-id',
					line: index + 1,
					rawId: malformedMatch[1] ?? '',
				})
			}

			const idMarkerPattern = /<!--\s*qj:id\b/gi;
			const completeIdCommentPattern = /<!--\s*qj:id\s*=\s*.*?-->/gi;

			const remainingText = rawText.replace(completeIdCommentPattern, '');

			for (const marker of remainingText.matchAll(idMarkerPattern)) {
				issues.push({
					type: 'malformed-id',
					line: index + 1,
					rawId: '',
				})
			}

            const objective: Objective = {
                id: idMatch?.[1],
                text: rawText.replace(idPattern, '').trim(),
                completed: (match[2] ?? '').toLowerCase() === 'x',
                depth: indentation,
                children: [],
				sourceLine: index + 1,
            };

            while (stack.length > 0) {
                const last = stack[stack.length - 1];

                if (!last || last.depth < objective.depth) break;

                stack.pop();
            }

            const parent = stack[stack.length - 1];

            if (parent) {
                parent.children.push(objective);
            } else {
                roots.push(objective);
            }

            stack.push(objective);
        }

        return {
			objectives: roots,
			issues,
		};
    }
