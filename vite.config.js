import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));

// LUNA loads Add Ons from file:// on Windows, where module scripts are blocked. So the page is
// not a Vite app: src/main.js and everything it imports build into one classic script (an
// IIFE) at dist/main.js, which index.html loads after vendor/luna.global.js. The CSS that
// src/ imports lands in dist/main.css. Same scheme as the SDK's add-on-typescript template.
export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: false,
  // __VERSION__ (the manifest's) is shown in the add-on window title.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    __VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // for LUNA's web inspector; ua-builder pack leaves maps out
    target: 'es2022',
    lib: { entry: 'src/main.js', formats: ['iife'], name: 'MidiLibrary', fileName: () => 'main.js', cssFileName: 'main' },
  },
  worker: { format: 'iife' },
  test: { include: ['tests/**/*.test.js'], environment: 'node', setupFiles: ['tests/setup.js'] },
}));
