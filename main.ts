// main.ts
import { App, Plugin, PluginManifest, WorkspaceLeaf } from "obsidian";
import { VaultCanvasView, VIEW_TYPE_VAULT_CANVAS } from "./view";
import { VaultCanvasSettings, VaultCanvasSettingTab, DEFAULT_SETTINGS } from "./settings";

export default class VaultCanvasPlugin extends Plugin {
    settings: VaultCanvasSettings;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
    }

    async onload() {
        console.log("Vault Canvas Plugin loaded");

        // Load settings
        await this.loadSettings();

        // Register view
        this.registerView(
            VIEW_TYPE_VAULT_CANVAS,
            (leaf: WorkspaceLeaf) => new VaultCanvasView(leaf, this.settings, this)
        );

        // Add ribbon icon (left menu button)
        this.addRibbonIcon("layout", "Open Block Manager", (evt: MouseEvent) => {
            this.activateView();
        });

        // Command to open the view
        this.addCommand({
            id: "open-view",
            name: "Open View",
            callback: () => this.activateView(),
        });

        // Settings tab
        this.addSettingTab(new VaultCanvasSettingTab(this.app, this));
    }

    onunload() {
        console.log("Vault Canvas Plugin unloaded");
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_VAULT_CANVAS)[0];

        if (!leaf) {
            leaf = workspace.getRightLeaf(false);
            if (leaf) await leaf.setViewState({ type: VIEW_TYPE_VAULT_CANVAS, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}