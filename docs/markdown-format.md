# Quest Journal Markdown format

> **Status:** Documents the current Quest Journal Markdown format
> and implemented behavior. Future functionality is explicitly
> identified as planned.

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

## 6. Completion semantics

Quest Journal distinguishes between **manual completion**, which is stored in Markdown, and **effective completion**, which is computed by the journal.

### Manual completion

The Markdown checkbox represents an objective's explicit completion state:

- `[ ]` — Not manually completed.
- `[x]` or `[X]` — Manually completed.

This state is stored as `Objective.completed: boolean`.

Checking or unchecking an objective manually changes only that objective's stored checkbox. Its parents and children are not modified.

### Effective completion

The journal computes an objective's effective completion recursively:

```text
effectivelyComplete(objective) =
    objective.completed
    OR (
        objective has at least one child
        AND every child is effectively complete
    )
```

Consequently:

- A leaf objective is effectively complete only when manually completed.
- A parent becomes automatically complete when all its children are effectively complete.
- Automatic completion propagates through multiple levels of nesting.
- Manually completing a parent does not complete its descendants.
- Reopening a child removes automatic completion from affected ancestors unless those ancestors remain manually complete or otherwise satisfy the recursive completion rule.
- Effective completion is derived from the current objective tree and is not persisted separately.

### Journal representation

The journal displays checkboxes according to effective completion rather than stored manual completion alone.

Manual and automatic completion are visually distinguished:

- Manually completed objectives use the standard checked appearance.
- Automatically completed objectives use a distinct checked appearance.
- Incomplete objectives remain unchecked.

An automatically completed parent can be clicked to mark it manually complete. Unchecking a manually completed parent removes its explicit completion, after which its effective state is recalculated from its children.

This means a parent whose Markdown checkbox is `[ ]` may appear checked in Quest Journal when all its children are complete.

### Objective counting

`countObjectives()` recursively counts every objective, including parents and descendants.

An objective contributes to the completed count when it is **effectively complete**, whether manually or automatically.

Each objective is counted independently. Manually completing a parent does not cause its incomplete descendants to count as complete.

### Known limitation

The current model does not support explicitly forcing a parent to remain incomplete when all its children are effectively complete.

A future custom checkbox marker could represent this override without requiring automatic completion to be persisted. No such marker is currently implemented.

Quest-level `quest_status: completed` remains independent of objective completion. Completing all objectives does not automatically change the quest's status.

## 7. Objective editing and persistence

When a user changes an editable objective checkbox, the repository uses Obsidian's `vault.process()` to read and modify the current file content.

The completion engine:

1. Reparses and validates the current quest content.
2. Locates the targeted objective using its stable objective ID.
3. Updates the checkbox on its recorded source line.
4. Preserves unrelated objective lines and descendant completion states.

The write is rejected if validation or source targeting fails.

Only explicit/manual completion is written to Markdown. Automatic completion is recalculated when the objective tree is evaluated.

**Line endings:** The parser accepts LF and CRLF. The completion writer splits on either and joins using CRLF if the content contains CRLF, otherwise LF. Mixed line endings are therefore not guaranteed to be preserved exactly.

## 8. Compatibility and known limitations

- Markdown remains the authoritative editable representation. Automatically completed objectives may appear checked in the journal while remaining unchecked in the underlying Markdown because effective completion is computed rather than persisted.
- Custom checkbox markers are not supported by the current parser. Adding them requires coordinated changes to parsing, validation, migration, editing, rendering, and tests.
- The parser does not enforce a formal Markdown grammar; it recognizes the specific heading and checkbox patterns described above.
- Duplicate `## Objectives` headings are not merged and should be avoided.
- A stable quest identifier, cross-quest relationships, and recurring objective semantics are future work, not part of the present file-format contract.

## 9. Maintenance rule

When changing how Markdown is parsed, validated, migrated, or written, update this document and the corresponding tests in the same change. Keep **implemented** and **planned** behavior explicitly separated.
