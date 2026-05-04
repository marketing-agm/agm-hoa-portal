import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// pdf.js needs character maps and standard font data to render older PDFs
// (anything relying on built-in fonts or non-Latin encodings). Copy both
// directories from node_modules into the build output so they are served
// same-origin from /pdfjs/ — no CDN dependency, no git bloat.
function pdfjsAssets() {
  const pdfjsRoot = resolve(__dirname, 'node_modules/pdfjs-dist');
  return {
    name: 'pdfjs-assets',
    apply: 'build',
    async closeBundle() {
      const outDir = resolve(__dirname, 'dist/pdfjs');
      await mkdir(outDir, { recursive: true });
      await cp(resolve(pdfjsRoot, 'cmaps'), resolve(outDir, 'cmaps'), { recursive: true });
      await cp(resolve(pdfjsRoot, 'standard_fonts'), resolve(outDir, 'standard_fonts'), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), pdfjsAssets()],
  build: {
    outDir: 'dist',
  },
});
