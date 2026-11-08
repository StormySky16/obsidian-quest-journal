export interface ObjectiveParseIssue {
	type: 'malformed-id';
	line: number;
	rawId: string;
}
