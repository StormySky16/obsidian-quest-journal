# Quest Journal

Quest Journal is an Obsidian community plugin for organizing Markdown notes as
main and side quests. It provides a two-pane journal, nested objective tracking,
completion counts, status filters, and a selected-quest view without adding XP,
streaks, or other active gamification.

The current interface is read-only. Quest notes remain ordinary Markdown files,
and objective ID migration is implemented as a tested, in-memory operation but
is not yet connected to vault writes.

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
- `quest_selected`: `true` when the quest is currently selected.
- `deadline`: optional text displayed in the quest detail.

For compatibility, the legacy value `quest_status: selected` is interpreted as
an available quest with `quest_selected: true`.

Quest content uses level-two sections and Markdown task lists:

```markdown
## Description
Prepare for the journey.

## Objectives
- [ ] Gather supplies
    - [x] Pack a map

## Notes
Optional supporting information.
```

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
