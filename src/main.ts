import { Plugin, TFile } from 'obsidian';
import { QuestJournalView, VIEW_TYPE } from './views/quest-journal-view';

export default class QuestJournalPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(
			VIEW_TYPE,
			(leaf) => new QuestJournalView(leaf, this),
		);

		this.addRibbonIcon('book-open', 'Open Quest Journal', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-quest-journal',
			name: 'Open Quest Journal',
			callback: () => void this.activateView(),
		});

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.path.startsWith('Quests/')) {
					void this.refreshViews();
				}
			}),
		);
	}

	private async refreshViews(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);

		for (const leaf of leaves) {
			await (leaf.view as QuestJournalView).refresh();
		}
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		const leaf = existing[0] ?? this.app.workspace.getLeaf('tab');

		if (!existing.length) {
			await leaf.setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		}

		await this.app.workspace.revealLeaf(leaf);
	}
}
