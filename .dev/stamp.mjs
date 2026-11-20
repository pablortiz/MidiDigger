// After `vite build`: give the bundle a content-hashed name (dist/main-<hash>.js and .css) and
// point index.html at it. LUNA's webview can keep an old dist/main.js cached across reopening
// the add-on window; a new name each build means it always loads the build just installed.
// (Not packed: ua-builder pack leaves dotfolders out.)

import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';

const dist = 'dist';
const js = readFileSync(`${dist}/main.js`);
const css = existsSync(`${dist}/main.css`) ? readFileSync(`${dist}/main.css`) : Buffer.alloc(0);
const hash = createHash('sha1').update(js).update(css).digest('hex').slice(0, 10);

// Old hashed bundles from earlier builds (vite empties dist/, but be safe).
for (const f of readdirSync(dist)) if (/^main-[0-9a-f]{10}\.(js|css|js\.map)$/.test(f)) unlinkSync(`${dist}/${f}`);

const jsName = `main-${hash}.js`;
const cssName = `main-${hash}.css`;
writeFileSync(`${dist}/${jsName}`, js.toString().replace(/\/\/# sourceMappingURL=main\.js\.map/, `//# sourceMappingURL=${jsName}.map`));
unlinkSync(`${dist}/main.js`);
if (existsSync(`${dist}/main.js.map`)) renameSync(`${dist}/main.js.map`, `${dist}/${jsName}.map`);
if (css.length) renameSync(`${dist}/main.css`, `${dist}/${cssName}`);

const html = readFileSync('index.html', 'utf8')
  .replace(/dist\/main(-[0-9a-f]{10})?\.js/g, `dist/${jsName}`)
  .replace(/dist\/main(-[0-9a-f]{10})?\.css/g, `dist/${cssName}`);
writeFileSync('index.html', html);
console.log(`index.html -> dist/${jsName}, dist/${cssName}`);
