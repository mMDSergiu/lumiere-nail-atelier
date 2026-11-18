import { defineConfig } from 'vite';

/** Builds the embeddable <nail-designer> widget into dist/widget. */
export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist/widget',
    emptyOutDir: true,
    lib: {
      entry: 'widget/src/main.ts',
      name: 'NailDesigner',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'nail-designer.js' : 'nail-designer.iife.js'),
    },
  },
});
