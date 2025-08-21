import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    build: {
        lib: {
            entry: 'main.ts',      // <-- Точка входа нашего плагина
            formats: ['cjs'],      // Obsidian требует CommonJS
            fileName: () => 'main.js',
        },
        rollupOptions: {
            external: ['obsidian'], // Не бандлить API Obsidian
        },
        outDir: './',
        emptyOutDir: false,      // Не удалять файлы в папке
    },
});
