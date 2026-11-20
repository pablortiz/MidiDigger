// npm run install-addon: the built add-on into the folder LUNA loads it from. LUNA 3.1.1 installs
// a .lunaaddon (double click) in ProgramData and loads it from there, not from the LOCALAPPDATA
// folder `ua-builder install` links into, so that one is not used. Only what the .lunaaddon holds
// goes (no sources, tests or source maps); bundles of earlier builds there are left alone, as
// removing files there may not be allowed.

import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dest = join(process.env.ProgramData ?? 'C:\\ProgramData', 'Universal Audio', 'LUNA', 'Add Ons', 'MIDI Digger');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const bundle = html.match(/dist\/(main-[0-9a-f]+)\.js/)?.[1];
if (!bundle) throw new Error('index.html loads no dist/main-<hash>.js: run npm run build first.');

mkdirSync(join(dest, 'dist'), { recursive: true });
for (const name of ['index.html', 'manifest.json', 'package.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.txt', 'README.md', 'licenses', 'sounds', 'vendor']) {
  if (existsSync(join(root, name))) cpSync(join(root, name), join(dest, name), { recursive: true, filter: (f) => !f.endsWith('.map') });
}
for (const ext of ['js', 'css']) cpSync(join(root, 'dist', `${bundle}.${ext}`), join(dest, 'dist', `${bundle}.${ext}`));
console.log(`Installed ${bundle} -> ${dest}\nClose and open LUNA again to load it.`);
