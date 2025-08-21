// view.ts
import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile, Menu } from "obsidian";
import type VaultCanvasPlugin from "./main";
import type { VaultCanvasSettings } from "./settings";

export const VIEW_TYPE_VAULT_CANVAS = "vault-block-manager";

interface FileBlock {
    file: TAbstractFile;
    element: HTMLElement;
}

export class VaultCanvasView extends ItemView {
    plugin: VaultCanvasPlugin;
    settings: VaultCanvasSettings;
    containerEl: HTMLElement;
    private currentFolder: TFolder;
    private blockContainer: HTMLElement;
    private navigationContainer: HTMLElement;
    private blocks: FileBlock[] = [];
    private draggedElement: HTMLElement | null = null;
    private draggedFile: TAbstractFile | null = null;

    constructor(leaf: WorkspaceLeaf, settings: VaultCanvasSettings, plugin: VaultCanvasPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.settings = settings;
        this.currentFolder = this.app.vault.getRoot();
    }

    getViewType() {
        return VIEW_TYPE_VAULT_CANVAS;
    }

    getDisplayText() {
        return "Block Manager";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("block-manager-container");

        this.navigationContainer = container.createEl("div", { cls: "block-manager-nav" });
        this.blockContainer = container.createEl("div", { cls: "block-manager-grid" });

        this.setupNavigation();
        this.renderBlocks();
        this.applyCustomStyles();
    }

    async onClose() {
        this.blocks = [];
        this.draggedElement = null;
        this.draggedFile = null;
    }

    private setupNavigation() {
        this.navigationContainer.empty();
        
        const backButton = this.navigationContainer.createEl("button", {
            cls: "block-manager-nav-btn",
            text: "← Back"
        });
        
        backButton.addEventListener("click", () => {
            if (this.currentFolder.parent) {
                this.currentFolder = this.currentFolder.parent;
                this.renderBlocks();
                this.setupNavigation();
            }
        });
        
        if (!this.currentFolder.parent) {
            backButton.disabled = true;
        }
        
        const pathEl = this.navigationContainer.createEl("span", {
            cls: "block-manager-path",
            text: this.currentFolder.path || "/"
        });
    }

    private renderBlocks() {
        this.blockContainer.empty();
        this.blocks = [];

        const filteredChildren = this.currentFolder.children.filter(child => {
            if (child instanceof TFolder) return true;
            if (child instanceof TFile && child.extension === 'md') return true;
            return false;
        });

        const children = filteredChildren.sort((a, b) => {
            if (a instanceof TFolder && b instanceof TFile) return -1;
            if (a instanceof TFile && b instanceof TFolder) return 1;
            
            if (this.settings.sortBy === 'date') {
                return b.stat.mtime - a.stat.mtime;
            }
            return a.name.localeCompare(b.name);
        });

        children.forEach(child => {
            const blockEl = this.createBlock(child);
            this.blockContainer.appendChild(blockEl);
            this.blocks.push({ file: child, element: blockEl });
        });
    }

    private createBlock(file: TAbstractFile): HTMLElement {
        const blockEl = this.blockContainer.createEl("div", {
            cls: file instanceof TFolder ? "file-block folder-block" : "file-block file-block-item"
        });

        const nameEl = blockEl.createEl("div", { cls: "block-name" });
        let displayName = file.name;
        if (file instanceof TFile && !this.settings.showFileExtensions) {
            displayName = file.basename;
        }
        nameEl.textContent = displayName;

        this.setupBlockEvents(blockEl, file);
        return blockEl;
    }

    private setupBlockEvents(blockEl: HTMLElement, file: TAbstractFile) {
        blockEl.draggable = true;

        blockEl.addEventListener("click", (e) => {
            if (file instanceof TFolder) {
                this.currentFolder = file;
                this.renderBlocks();
                this.setupNavigation();
            } else {
                this.app.workspace.openLinkText(file.path, "", false);
            }
        });

        blockEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showContextMenu(e, file);
        });

        blockEl.addEventListener("dragstart", (e) => {
            this.draggedElement = blockEl;
            this.draggedFile = file;
            blockEl.addClass("dragging");
        });

        blockEl.addEventListener("dragend", () => {
            blockEl.removeClass("dragging");
            this.draggedElement = null;
            this.draggedFile = null;
        });

        blockEl.addEventListener("dragover", (e) => {
            if (file instanceof TFolder && this.draggedFile && this.draggedFile !== file) {
                e.preventDefault();
                blockEl.addClass("drop-target");
            }
        });

        blockEl.addEventListener("dragleave", () => {
            blockEl.removeClass("drop-target");
        });

        blockEl.addEventListener("drop", async (e) => {
            e.preventDefault();
            blockEl.removeClass("drop-target");
            
            if (file instanceof TFolder && this.draggedFile && this.draggedFile !== file) {
                const newPath = file.path + "/" + this.draggedFile.name;
                try {
                    await this.app.vault.rename(this.draggedFile, newPath);
                    this.renderBlocks();
                } catch (error) {
                    console.error("Failed to move file:", error);
                }
            }
        });
    }

    private showContextMenu(e: MouseEvent, file: TAbstractFile) {
        const menu = new Menu();

        menu.addItem((item) => {
            item.setTitle("Open")
                .setIcon("file")
                .onClick(() => {
                    if (file instanceof TFile) {
                        this.app.workspace.openLinkText(file.path, "", false);
                    } else {
                        this.currentFolder = file as TFolder;
                        this.renderBlocks();
                        this.setupNavigation();
                    }
                });
        });

        menu.addItem((item) => {
            item.setTitle("Rename")
                .setIcon("pencil")
                .onClick(() => {
                    this.renameFile(file);
                });
        });

        menu.addItem((item) => {
            item.setTitle("Delete")
                .setIcon("trash")
                .onClick(async () => {
                    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
                        try {
                            await this.app.vault.delete(file);
                            this.renderBlocks();
                        } catch (error) {
                            console.error("Failed to delete file:", error);
                        }
                    }
                });
        });

        menu.addItem((item) => {
            item.setTitle("Reveal in file explorer")
                .setIcon("folder")
                .onClick(() => {
                    this.app.showInFolder(file.path);
                });
        });

        menu.showAtMouseEvent(e);
    }

    private async renameFile(file: TAbstractFile) {
        const newName = prompt("Enter new name:", file.name);
        if (newName && newName !== file.name) {
            const newPath = file.parent?.path ? `${file.parent.path}/${newName}` : newName;
            try {
                await this.app.vault.rename(file, newPath);
                this.renderBlocks();
            } catch (error) {
                console.error("Failed to rename file:", error);
            }
        }
    }

    private applyCustomStyles() {
        const styleEl = document.getElementById('block-manager-custom-styles') || document.createElement('style');
        styleEl.id = 'block-manager-custom-styles';
        
        const fontSize = this.settings.fontSize;
        const textColor = this.settings.textColor;
        
        styleEl.textContent = `
            .block-name {
                font-size: ${fontSize}px !important;
                ${textColor ? `color: ${textColor} !important;` : ''}
            }
        `;
        
        if (!document.getElementById('block-manager-custom-styles')) {
            document.head.appendChild(styleEl);
        }
    }
}