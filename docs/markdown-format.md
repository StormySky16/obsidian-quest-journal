# Quest Journal Markdown format

> **Status:** Documents the implementation in the supplied November 2026 snapshot. Planned behavior is explicitly marked and is not yet implemented.

Quest Journal stores quests as ordinary Markdown files. The file remains the source of truth; the journal parses and presents it. A person should be able to inspect and meaningfully edit the core quest content without the plugin.

## 1. Quest discovery and identity

- The repository loads Markdown files whose paths begin with `Quests/` (including subfolders).
- The quest title is the file basename, not a frontmatter `title` field.
- The current in-memory quest model holds an Obsidian `TFile`; a stable quest UUID is **not implemented**.
- Objective IDs are validated within each quest, not globally across all quest files.

## 2. Frontmatter

Example:

```yaml
---
quest_type: main
quest_status: available
quest_selected: true
deadline: 2026-12-31
---
```

| Property | Current interpretation |
| --- | --- |
| `quest_type` | `side` means side quest; all other or missing values become `main`. |
| `quest_status` | `available`, `paused`, or `completed`; invalid or missing values become `available`. |
| `quest_selected` | Selected only when the parsed value is the boolean `true`. |
| `deadline` | Optional; a truthy value is converted to a string. No date validation occurs in the parser. |

**Legacy compatibility:** `quest_status: selected` produces `status: available` and `selected: true`. Selection is otherwise independent of quest status.

## 3. Sections

Quest Journal recognizes level-two headings written as `## Heading`. Heading names are trimmed and matched case-insensitively. Currently used sections are:

- `## Description` — trimmed section text.
- `## Objectives` — parsed task list (see below).
- `## Notes` — trimmed section text.

Other level-two sections may be present but are not mapped to quest fields. A section ends at the next recognized level-two heading. Content before the first recognized heading is not included in these sections. Duplicate headings of the same normalized name currently cause the **last** section to replace earlier ones; this is an implementation limitation, not recommended authoring practice.

## 4. Objective syntax and hierarchy

Supported task-list examples:

```markdown
## Objectives
- [ ] Gather supplies <!-- qj:id=objective-1 -->
    - [x] Pack a map <!-- qj:id=objective-2 -->
    * [X] Check the route <!-- qj:id=objective-3 -->
```

Current parser rules:

- Objective lines begin with optional whitespace, then `-` or `*`, whitespace, and a checkbox marker `[ ]`, `[x]`, or `[X]`, followed by whitespace and nonempty objective text.
- Only matching task lines inside the selected `## Objectives` section become objectives. Other text in the section is ignored by the objective parser.
- Indentation determines nesting: an objective becomes a child of the nearest preceding objective with **less** indentation. Tabs count as four spaces for indentation comparisons. The parser does not require a particular number of spaces per level.
- The objective text is trimmed. A valid trailing ID comment is stripped from the parsed display text.
- The parser records the original 1-based source line number for safe updates.
- `[x]` and `[X]` both parse as `completed: true`; `[ ]` parses as `false`.
- Other checkbox characters, including `[/]` and `[-]`, are **not currently recognized** as objectives.

## 5. Objective IDs

The supported ID comment is a trailing comment of the form:

```markdown
- [ ] Gather supplies <!-- qj:id=abc-123 -->
```

- The recognized ID value contains ASCII letters, digits, and hyphens (`[a-zA-Z0-9-]+`).
- The parser detects malformed `qj:id` markers on recognized objective lines and reports them as parse issues.
- Missing IDs are permitted for reading, but objective editing requires every recognized objective in the quest to have an ID.
- Duplicate IDs within a quest block editing. Global uniqueness across files is not currently checked.
- Objective ID migration adds missing trailing comments while preserving existing valid IDs. It refuses to commit a partial result if it encounters malformed IDs, duplicates, a source mismatch, or ID-generation failure.

### Edit readiness

| State | Condition | Behavior |
| --- | --- | --- |
| `ready` | No malformed ID issues, no duplicates, no missing IDs | Objective checkboxes may be edited. |
| `migration-required` | Missing IDs, but no malformed IDs or duplicates | User may initiate ID migration before editing. |
| `blocked` | Malformed IDs or duplicate IDs | Editing is blocked pending repair. |

## 6. Current completion and persistence behavior

**Implemented today:** `Objective.completed` is a boolean derived directly from its Markdown checkbox. Parent and child checkboxes are independent; no recursive completion is computed yet. `countObjectives()` counts every parsed objective, including parents and children, and counts only those whose stored checkbox is checked.

When a user changes an editable objective checkbox, the repository uses Obsidian's `vault.process()` to re-read and modify the file. The completion engine reparses and validates the current content, finds the target by objective ID, and changes the checkbox on its recorded source line. It does not rewrite other objective lines or automatically change parents or descendants. The write can fail if validation or source targeting fails.

**Line endings:** The parser accepts LF and CRLF. The completion writer splits on either and joins using CRLF if the content contains CRLF, otherwise LF; therefore mixed line endings are not guaranteed to be preserved exactly.

## 7. Planned: hierarchical effective completion

**Not yet implemented.** The agreed design keeps the Markdown checkbox as the **explicit/manual** completion state and derives the **effective** state recursively:

```text
effectivelyComplete(objective) =
    objective.completed
    OR (
        objective has at least one child
        AND every child is effectively complete
    )
```

Consequences:

- A parent with all descendants effectively complete can appear automatically complete even if its own Markdown checkbox is `[ ]`.
- Explicitly completing a parent does **not** change its children.
- Reopening a child removes automatic completion from ancestors unless an ancestor is explicitly complete or still qualifies through its children.
- Leaf objectives are complete only when explicitly checked.
- Planned journal progress counts will use effective completion, while stored checkboxes continue to represent manual intent.
- Planned UI will visually distinguish explicit/manual completion from computed/automatic completion.
- An explicit *force-incomplete* override when all children are complete is **not supported** by this model. An additional checkbox marker is a possible future extension, not part of the current syntax.

Quest-level `quest_status: completed` remains a separate, explicitly managed status; objective completion does not automatically change it.

## 8. Compatibility and known limitations

- Markdown remains the authoritative editable representation; some computed journal states may differ visually from raw checkbox markers once hierarchical completion is implemented.
- Custom checkbox markers are not supported by the current parser. Adding them requires coordinated changes to parsing, validation, migration, editing, rendering, and tests.
- The parser does not enforce a formal Markdown grammar; it recognizes the specific heading and checkbox patterns described above.
- Duplicate `## Objectives` headings are not merged and should be avoided.
- A stable quest identifier, cross-quest relationships, and recurring objective semantics are future work, not part of the present file-format contract.

## 9. Maintenance rule

When changing how Markdown is parsed, validated, migrated, or written, update this document and the corresponding tests in the same change. Keep **implemented** and **planned** behavior explicitly separated.
