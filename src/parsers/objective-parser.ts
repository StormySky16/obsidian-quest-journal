import { Objective } from "../models/objective"

export function parseObjectives(objectiveText: string): Objective[] {
        const roots: Objective[] = [];
        const stack: Objective[] = [];

        const idPattern = /\s+<!--\s*qj:id=([a-zA-Z0-9-]+)\s*-->\s*$/;

        for (const line of objectiveText.split('\n')) {
            const match = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);

            if (!match) continue;

            const indentation = (match[1] ?? '').replace(/\t/g, '    ').length;

            const rawText = (match[3] ?? '').trim();
            const idMatch = rawText.match(idPattern);

            const objective: Objective = {
                id: idMatch?.[1],
                text: rawText.replace(idPattern, '').trim(),
                completed: (match[2] ?? '').toLowerCase() === 'x',
                depth: indentation,
                children: [],
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

        return roots;
    }