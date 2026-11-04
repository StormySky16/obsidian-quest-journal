import { ItemView, Plugin, TFile, WorkspaceLeaf, setIcon } from 'obsidian';

const VIEW_TYPE = 'quest-journal-view';

type QuestType = 'main' | 'side';
type QuestStatus = 'selected' | 'available' | 'paused' | 'completed';
type JournalTab = 'all' | 'main' | 'side' | 'selected';

interface Objective {
	text: string;
	completed: boolean;
	depth: number;
	children: Objective[];
}

interface Quest {
	file: TFile;
	title: string;
	type: QuestType;
	status: QuestStatus;
	description: string;
	objectives: Objective[];
	deadline?: string;
	notes: string;
}

interface QuestTag {
	id: string;
	name: string;
	color: string;
}

class QuestJournalView extends ItemView {
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

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.quests = await this.loadQuests();

		if (
			!this.quests.some((quest) => quest.file.path === this.selectedPath)
		) {
			this.selectedPath = this.quests[0]?.file.path ?? null;
		}

		this.render();
	}

	private async loadQuests(): Promise<Quest[]> {
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.startsWith('Quests/'));

		return Promise.all(files.map((file) => this.parseQuest(file)));
	}

	private async parseQuest(file: TFile): Promise<Quest> {
		const content = await this.app.vault.cachedRead(file);
		const metadata =
			this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};

		const type: QuestType =
			metadata.quest_type === 'side' ? 'side' : 'main';

		const validStatuses: QuestStatus[] = [
			'selected',
			'available',
			'paused',
			'completed',
		];

		const status: QuestStatus = validStatuses.includes(
			metadata.quest_status,
		)
			? metadata.quest_status
			: 'available';

		const sections = this.extractSections(content);

		const objectiveText = sections.get('objectives') ?? '';
		const objectives = this.parseObjectives(objectiveText);

		return {
			file,
			title: file.basename,
			type,
			status,
			description: sections.get('description')?.trim() ?? '',
			objectives,
			deadline: metadata.deadline ? String(metadata.deadline) : undefined,
			notes: sections.get('notes')?.trim() ?? '',
		};
	}

	private parseObjectives(objectiveText: string): Objective[] {
		const roots: Objective[] = [];
		const stack: Objective[] = [];

		for (const line of objectiveText.split('\n')) {
			const match = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);

			if (!match) continue;

			const indentation = (match[1] ?? '').replace(/\t/g, '    ').length;

			const objective: Objective = {
				text: (match[3] ?? '').trim(),
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

	private countObjectives(objectives: Objective[]): {
		completed: number;
		total: number;
	} {
		let completed = 0;
		let total = 0;

		for (const objective of objectives) {
			total++;

			if (objective.completed) completed++;

			const childCounts = this.countObjectives(objective.children);

			completed += childCounts.completed;
			total += childCounts.total;
		}

		return { completed, total };
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
			} else {
				row.createSpan({ cls: 'quest-objective-spacer' });
			}

			if (hasChildren) {
				const childContainer = item.createDiv({
					cls: 'quest-objective-children',
				});
				this.renderObjectives(childContainer, objective.children);

				let expanded = !objective.completed;
				childContainer.hidden = !expanded;

				if (toggleButton) {
					toggleButton?.addEventListener('click', () => {
						expanded = !expanded;
						childContainer.hidden = !expanded;

						setIcon(
							toggleButton!,
							expanded ? 'chevron-down' : 'chevron-right',
						);

						toggleButton!.setAttr(
							'aria-expanded',
							String(expanded),
						);
					});
				}
			}
		}
	}

	private extractSections(content: string): Map<string, string> {
		const sections = new Map<string, string>();
		let current: string | null = null;
		let lines: string[] = [];

		const save = () => {
			if (current) sections.set(current, lines.join('\n').trim());
		};

		for (const line of content.split('\n')) {
			const heading = line.match(/^##\s+(.+)$/);

			if (heading) {
				save();
				current =
					heading[1] === undefined
						? ''
						: heading[1].trim().toLowerCase();
				lines = [];
			} else if (current) {
				lines.push(line);
			}
		}

		save();
		return sections;
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

				const counts = this.countObjectives(quest.objectives);

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
