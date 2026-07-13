import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: './', // Ensures relative paths for sub-domain deployment
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});
