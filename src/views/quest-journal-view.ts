import { App, ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { Quest, QuestType, QuestStatus } from "../models/quest";
import { loadQuests } from "../services/quest-repository";
import { Objective } from "../models/objective";
import { countObjectives } from "../engine/objective-engine";

import QuestJournalPlugin from "../main";

export const VIEW_TYPE = 'quest-journal-view';

type JournalTab = 'all' | 'main' | 'side' | 'selected';

export class QuestJournalView extends ItemView {
	private quests: Quest[] = [];
	private activeTab: JournalTab = 'all';
	private selectedPath: string | null = null;
	private showingDetail = false;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: QuestJournalPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Quest Journal';
	}

	getIcon(): string {
		return 'book-open';
	}

    getApp(): App {
        return this.app;
    }

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.quests = await loadQuests(this.app);

		if (
			!this.quests.some((quest) => quest.file.path === this.selectedPath)
		) {
			this.selectedPath = this.quests[0]?.file.path ?? null;
		}

		this.render();
	}

	private renderObjectives(
		container: HTMLElement,
		objectives: Objective[],
	): void {
		for (const objective of objectives) {
			const item = container.createDiv({ cls: 'quest-objective-item' });

			const row = item.createDiv({ cls: 'quest-objective' });

			const hasChildren = objective.children.length > 0;

			let toggleButton: HTMLButtonElement | null = null;
			const checkbox = row.createEl('input', {
				type: 'checkbox',
			});

			checkbox.checked = objective.completed;
			checkbox.disabled = true;

			row.createSpan({ text: objective.text });

			if (hasChildren) {
				toggleButton = row.createEl('button', {
					cls: 'quest-objective-toggle clickable-icon',
					attr: {
						'aria-label': 'Toggle subobjectives',
						'aria-expanded': String(!objective.completed),
					},
				});

				setIcon(
					toggleButton,
					objective.completed ? 'chevron-right' : 'chevron-down',
				);
			} 

			if (hasChildren) {
				const childContainer = item.createDiv({
					cls: 'quest-objective-children',
				});
				this.renderObjectives(childContainer, objective.children);

				let expanded = !objective.completed;
				childContainer.hidden = !expanded;

				if (toggleButton) {
                    const button = toggleButton;
					button.addEventListener('click', () => {
						expanded = !expanded;
						childContainer.hidden = !expanded;

						setIcon(
							button,
							expanded ? 'chevron-down' : 'chevron-right',
						);

						button.setAttr(
							'aria-expanded',
							String(expanded),
						);
					});
				}
			}
		}
	}

	private getVisibleQuests(): Quest[] {
		return this.quests
			.filter((quest) => {
				if (this.activeTab === 'all') return true;
				if (this.activeTab === 'selected') {
					return quest.status === 'selected';
				}
				return quest.type === this.activeTab;
			})
			.sort((a, b) => {
				if (a.status === 'selected' && b.status !== 'selected') {
					return -1;
				}
				if (b.status === 'selected' && a.status !== 'selected') {
					return 1;
				}
				return a.title.localeCompare(b.title);
			});
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('quest-journal');

		const header = root.createDiv({ cls: 'quest-header' });
		header.createEl('h2', { text: 'Quest Journal' });

		const refreshButton = header.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': 'Refresh quests' },
		});
		setIcon(refreshButton, 'refresh-cw');
		refreshButton.addEventListener('click', () => {
			void this.refresh();
		});

		const tabs = root.createDiv({ cls: 'quest-tabs' });

		const tabNames: { id: JournalTab; label: string }[] = [
			{ id: 'all', label: 'All' },
			{ id: 'main', label: 'Main' },
			{ id: 'side', label: 'Side' },
			{ id: 'selected', label: 'Selected' },
		];

		for (const tab of tabNames) {
			const button = tabs.createEl('button', {
				text: tab.label,
				cls: this.activeTab === tab.id ? 'is-active' : '',
			});

			button.addEventListener('click', () => {
				this.activeTab = tab.id;
				this.showingDetail = false;
				this.render();
			});
		}

		const layout = root.createDiv({
			cls: 'quest-layout' + (this.showingDetail ? ' show-detail' : ''),
		});

		const list = layout.createDiv({ cls: 'quest-list' });
		const detail = layout.createDiv({ cls: 'quest-detail' });

		const visible = this.getVisibleQuests();

		for (const type of ['main', 'side'] as QuestType[]) {
			const group = visible.filter((quest) => quest.type === type);
			if (group.length === 0) continue;

			list.createEl('h4', {
				text: `${type === 'main' ? 'Main' : 'Side'} Quests (${group.length})`,
			});

			for (const quest of group) {
				const row = list.createDiv({
					cls:
						'quest-list-item' +
						(quest.file.path === this.selectedPath
							? ' is-selected'
							: ''),
				});

				const icon = row.createSpan({ cls: 'quest-status-icon' });
				const iconNames: Record<QuestStatus, string> = {
					selected: 'bookmark-check',
					available: 'circle',
					paused: 'pause-circle',
					completed: 'check-circle-2',
				};
				setIcon(icon, iconNames[quest.status]);

				const label = row.createDiv({ cls: 'quest-list-label' });
				label.createDiv({ text: quest.title });

				const counts = countObjectives(quest.objectives);

				label.createEl('small', {
					text: `${counts.completed}/${counts.total} objectives`,
				});

				row.addEventListener('click', () => {
					this.selectedPath = quest.file.path;
					this.showingDetail = true;
					this.render();
				});
			}
		}

		const selected = visible.find(
			(quest) => quest.file.path === this.selectedPath,
		);

		if (!selected) {
			detail.createEl('p', {
				text: 'Select a quest to view its details.',
				cls: 'quest-muted',
			});
			return;
		}

		const back = detail.createEl('button', {
			text: '← Back to quests',
			cls: 'quest-back',
		});
		back.addEventListener('click', () => {
			this.showingDetail = false;
			this.render();
		});

		detail.createEl('h2', { text: selected.title });

		const status = detail.createDiv({ cls: 'quest-detail-status' });
		status.setText(`Status: ${selected.status}`);

		if (selected.deadline) {
			detail.createEl('p', {
				text: `Deadline: ${selected.deadline}`,
				cls: 'quest-muted',
			});
		}

		detail.createEl('h3', { text: 'Description' });
		detail.createEl('p', {
			text: selected.description || 'No description.',
		});

		detail.createEl('h3', { text: 'Objectives' });

		if (selected.objectives.length === 0) {
			detail.createEl('p', {
				text: 'No objectives.',
				cls: 'quest-muted',
			});
		}

		// Render objectives
		this.renderObjectives(detail, selected.objectives);

		if (selected.notes) {
			detail.createEl('h3', { text: 'Notes' });
			detail.createEl('p', { text: selected.notes });
		}

		const openNote = detail.createEl('button', {
			text: 'Open source note',
		});

		openNote.addEventListener('click', () => {
			void this.app.workspace.getLeaf('tab').openFile(selected.file);
		});
	}
}