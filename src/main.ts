import { Plugin } from 'obsidian';
import { QuestJournalView, VIEW_TYPE } from './views/quest-journal-view';

export default class QuestJournalPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(
			VIEW_TYPE,
			(leaf) => new QuestJournalView(leaf, this),
		);

		this.addRibbonIcon('book-open', 'Open quest journal', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-quest-journal',
			name: 'Open journal',
			callback: () => void this.activateView(),
		});

		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file.path.startsWith('Quests/')) {
					void this.refreshViews();
				}
			}),
		);
	}

	private async refreshViews(): Promise<void> {
		//console.debug('Quest Journal: Refreshing views');
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
