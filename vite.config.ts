import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
// @ts-expect-error plain JS module shared with the production server
import { createApi, loadEnv } from './server/api.js';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = fileURLToPath(new URL('./dist/website', import.meta.url));

/** The same API as the production server (login, saving content, uploads) during npm run dev. */
function salonApi(): Plugin {
  return {
    name: 'salon-api',
    configureServer(server) {
      loadEnv(projectDir);
      server.middlewares.use(createApi({ dataDir: process.env.DATA_DIR || projectDir + 'data' }));
    },
    configurePreviewServer(server) {
      loadEnv(projectDir);
      server.middlewares.use(createApi({ dataDir: process.env.DATA_DIR || projectDir + 'data' }));
    },
  };
}

/**
 * Browsers refuse to run module scripts from file://. The website is bundled into a single
 * self-contained script, wrapped in a function and loaded as a classic deferred script, so
 * dist/website/index.html also works with a double-click (as well as on any web host).
 */
function openFromDisk(): Plugin {
  return {
    name: 'open-from-disk',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        if (/^\s*(import|export)\s/m.test(file.code)) {
          this.error(`${file.fileName} still has import/export statements; it must be one self-contained chunk.`);
        }
        file.code = `(function () {\n${file.code}\n})();\n`;
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html
          .replace(/<script type="module" crossorigin/g, '<script defer')
          .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"'),
    },
  };
}

/** The salon website (website/), with the widget source imported directly. */
export default defineConfig({
  root: 'website',
  base: './',
  plugins: [openFromDisk(), salonApi()],
  server: { port: 5173 },
  build: {
    target: 'es2020',
    outDir,
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: { output: { codeSplitting: false } },
  },
});
