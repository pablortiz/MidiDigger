// npm run pack: the built add-on as MIDI-Digger-0.6.lunaaddon, with only what an installation holds
// (the same files .dev/install.mjs copies). `ua-builder pack` alone takes every file of the
// project folder, so anything else left there (saved analyses, exports) would go into the package.
// The files are put together in a folder of their own under the system's temp folder and packed
// from there; the project folder is not touched.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
// The package's top folder (and file) is always MIDI-Digger, whatever the working folder is called.
const name = 'MIDI-Digger';
const html = readFileSync(join(root, 'index.html'), 'utf8');
const bundle = html.match(/dist\/(main-[0-9a-f]+)\.js/)?.[1];
if (!bundle) throw new Error('index.html loads no dist/main-<hash>.js: run npm run build first.');

const stage = join(tmpdir(), 'midi-digger-pack', name);   // the package's top folder takes this name
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'dist'), { recursive: true });
for (const item of ['index.html', 'manifest.json', 'package.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.txt', 'README.md', 'licenses', 'sounds', 'vendor']) {
  if (existsSync(join(root, item))) cpSync(join(root, item), join(stage, item), { recursive: true, filter: (f) => !f.endsWith('.map') });
}
for (const ext of ['js', 'css']) cpSync(join(root, 'dist', `${bundle}.${ext}`), join(stage, 'dist', `${bundle}.${ext}`));
// The worker the bundle starts, beside it in dist/assets.
if (existsSync(join(root, 'dist', 'assets'))) cpSync(join(root, 'dist', 'assets'), join(stage, 'dist', 'assets'), { recursive: true, filter: (f) => !f.endsWith('.map') });

const out = join(root, `${name}.lunaaddon`);
const cli = join(root, 'node_modules', '@uaudio', 'luna-builder-sdk', 'dist', 'cli.js');
execFileSync(process.execPath, [cli, 'pack', stage, '--out', out], { stdio: 'inherit' });
rmSync(join(tmpdir(), 'midi-digger-pack'), { recursive: true, force: true });
