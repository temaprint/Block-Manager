// settings.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultCanvasPlugin from "./main";

export interface VaultCanvasSettings {
    blockSize: number;
    showFileExtensions: boolean;
    sortBy: 'name' | 'date';
    gridGap: number;
    fontSize: number;
    textColor: string;
}

export const DEFAULT_SETTINGS: VaultCanvasSettings = {
    blockSize: 120,
    showFileExtensions: true,
    sortBy: 'name',
    gridGap: 16,
    fontSize: 13,
    textColor: '',
};

export class VaultCanvasSettingTab extends PluginSettingTab {
    plugin: VaultCanvasPlugin;

    constructor(app: App, plugin: VaultCanvasPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Block Manager Settings" });


        new Setting(containerEl)
            .setName("Font size")
            .setDesc("Size of text in blocks")
            .addSlider(slider =>
                slider
                    .setLimits(10, 18, 1)
                    .setValue(this.plugin.settings.fontSize)
                    .onChange(async (value) => {
                        this.plugin.settings.fontSize = value;
                        await this.plugin.saveSettings();
                        this.updateBlockStyles();
                    })
            );

        new Setting(containerEl)
            .setName("Text color")
            .setDesc("Custom color for block text (leave empty for theme default)")
            .addText(text =>
                text
                    .setPlaceholder("#000000")
                    .setValue(this.plugin.settings.textColor)
                    .onChange(async (value) => {
                        this.plugin.settings.textColor = value;
                        await this.plugin.saveSettings();
                        this.updateBlockStyles();
                    })
            );
    }

    private updateBlockStyles() {
        const styleEl = document.getElementById('block-manager-custom-styles') || document.createElement('style');
        styleEl.id = 'block-manager-custom-styles';
        
        const fontSize = this.plugin.settings.fontSize;
        const textColor = this.plugin.settings.textColor;
        
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