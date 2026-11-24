# Quest Journal

Quest Journal is an Obsidian community plugin for organizing Markdown notes as
main and side quests. It provides a two-pane journal, nested objective tracking,
completion counts, interactive quest status management, quest type filters, and a
selected-quest view without adding XP, streaks, or other active gamification.

The journal supports interactive objective checkboxes for quests with valid
objective IDs. Quests with missing objective IDs can be migrated directly from
the journal to enable objective editing. Objective editing remains blocked for
quests containing malformed or duplicate objective IDs until the issues are
manually resolved.

Quest statuses can be changed directly through the journal. Completing a quest
through the journal automatically clears its prioritisation without modifying
its objectives. Quest completion remains independent of objective completion,
and direct Markdown edits preserve independent control over both status and
prioritisation.

## Quest format

Store quest notes beneath the `Quests/` folder. Frontmatter supports:

```yaml
---
quest_type: main
quest_status: available
quest_selected: true
deadline: 2026-12-31
---
```

- `quest_type`: `main` or `side`; defaults to `main`.
- `quest_status`: `available`, `paused`, or `completed`; defaults to `available`.
- `quest_selected`: `true` when the quest is prioritised, independently of its status.
- `deadline`: optional text displayed in the quest detail.

For compatibility, the legacy value `quest_status: selected` is interpreted as
an available quest with `quest_selected: true`.

Quest content uses level-two sections and Markdown task lists:

```markdown
## Description
Prepare for the journey.

## Objectives
- [ ] Gather supplies <!-- qj:id=example-uuid-1 -->
    - [x] Pack a map <!-- qj:id=example-uuid-2  -->

Objective IDs are generated automatically during migration.
The IDs above are illustrative; generated IDs use UUIDs.

## Notes
Optional supporting information.
```
Objective IDs are generated automatically during migration. 
The generated-UUID values above are placeholders for illustration.

For detailed information about quest file structure, objective IDs,
validation, migration, completion semantics, and quest status persistence,
see the [Markdown format specification](docs/markdown-format.md).

## Development

Use the current Node.js LTS release and npm.

```bash
npm install
npm test
npm run build
npm run lint
```

Run `npm run dev` for an esbuild watch process. The production build creates
`main.js` at the plugin root; generated build output and `node_modules/` should
not be committed.

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<Vault>/.obsidian/plugins/quest-journal/
```

Reload Obsidian, then enable **Quest Journal** under
**Settings → Community plugins**.

## Privacy

Quest Journal operates locally. It does not make network requests, collect
analytics, or transmit vault data.

## License

[0BSD](LICENSE)
