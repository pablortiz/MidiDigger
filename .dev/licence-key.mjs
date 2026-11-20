// Development only: MIDI Digger's licence keys (src/licence.js checks them).
//
//   node .dev/licence-key.mjs init               the signing key pair, made once (refuses to replace it)
//   node .dev/licence-key.mjs make <email> [v]   a licence key for a buyer (v: major version, default 1)
//   node .dev/licence-key.mjs make <email> --days 7   a promotional key: the loops for 7 days
//   node .dev/licence-key.mjs check <key>        what a key says, and whether its signature is good
//
// The PRIVATE key lives outside the project (KEY_DIR), never in the repository or the add-on:
// whoever has it can make keys. Keep a backup of that folder somewhere safe (a USB stick, a
// password manager): without it no more keys can be made for this public key. The public key
// goes into src/licence.js (PUBLIC_KEY), which `init` prints.
//
// A key is "MD1-" + base64url(payload JSON) + "." + base64url(Ed25519 signature of the payload).
// Payload: { p: 'mididigger', v: major version, e: buyer's email, d: date, n: key id, x: last day (promotional keys only) }.

import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign, verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KEY_DIR = process.env.MIDI_DIGGER_KEYS || 'D:\\UAUDIO\\MIDI-Digger-keys';
const PRIVATE = join(KEY_DIR, 'licence-private-key.pem');
const LOG = join(KEY_DIR, 'issued-keys.csv');

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const [cmd, arg, ver] = process.argv.slice(2);

function privateKey() {
  if (!existsSync(PRIVATE)) throw new Error(`No private key at ${PRIVATE}: run "init" first.`);
  return createPrivateKey(readFileSync(PRIVATE));
}

if (cmd === 'init') {
  if (existsSync(PRIVATE)) throw new Error(`${PRIVATE} exists already: not replaced (every key made with it would stop working).`);
  mkdirSync(KEY_DIR, { recursive: true });
  const { privateKey: priv, publicKey: pub } = generateKeyPairSync('ed25519');
  writeFileSync(PRIVATE, priv.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx' });
  writeFileSync(LOG, 'date,email,version,id,key\n', { flag: 'wx' });
  console.log(`Private key: ${PRIVATE} (back this folder up; never share it)`);
  console.log(`PUBLIC_KEY for src/licence.js: '${pub.export({ format: 'jwk' }).x}'`);
} else if (cmd === 'make') {
  // make <email> [v] [--days N]: --days makes a promotional key, valid for N days from today
  // (today counts as the first), then the loops lock again.
  const args = process.argv.slice(3);
  const daysAt = args.indexOf('--days');
  const days = daysAt >= 0 ? Number(args[daysAt + 1]) : null;
  const rest = daysAt >= 0 ? args.filter((_, i) => i !== daysAt && i !== daysAt + 1) : args;
  const email = String(rest[0] ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: make <buyer email> [major version] [--days N]');
  if (days !== null && !(Number.isInteger(days) && days > 0)) throw new Error('--days needs a whole number of days, e.g. --days 7');
  const today = new Date();
  const day = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const until = days ? day(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days - 1)) : null;
  const payload = { p: 'mididigger', v: Number(rest[1] ?? 1), e: email, d: day(today), n: b64u(randomBytes(6)), ...(until ? { x: until } : {}) };
  const bytes = Buffer.from(JSON.stringify(payload));
  const key = `MD1-${b64u(bytes)}.${b64u(sign(null, bytes, privateKey()))}`;
  if (existsSync(LOG)) {
    const log = readFileSync(LOG, 'utf8');
    if (!log.startsWith('date,email,version,id,key,until')) writeFileSync(LOG, log.replace(/^date,email,version,id,key\r?\n/, 'date,email,version,id,key,until\n'));
    writeFileSync(LOG, `${payload.d},${email},${payload.v},${payload.n},${key},${until ?? ''}\n`, { flag: 'a' });
  }
  console.log(key);
  if (until) {
    console.log(`\n(Promotional key: valid until ${until} included.)`);
    console.log(`\n--- email ---\nSubject: Your MIDI Digger promotional key\n\nHere is a promotional key that unlocks MIDI Digger's loops until ${until}:\n\n${key}\n\nIn MIDI Digger (LUNA), click the licence button at the top right (or try to open a loop), paste the key and press Activate. It works without an internet connection. After that date you can buy a licence from the same window (Buy…).\n\nelper.es`);
  } else {
    console.log(`\n--- email ---\nSubject: Your MIDI Digger licence key\n\nThank you for buying MIDI Digger!\n\nYour licence key:\n\n${key}\n\nIn MIDI Digger (LUNA), click the licence button at the top right (or try to open a loop), paste the key and press Activate. It works without an internet connection.\n\nelper.es`);
  }
} else if (cmd === 'check') {
  const m = /^MD1-([\w-]+)\.([\w-]+)$/.exec(String(arg ?? '').trim());
  if (!m) throw new Error('Not a MIDI Digger key.');
  const bytes = Buffer.from(m[1], 'base64url');
  const pub = createPublicKey(privateKey());
  console.log(JSON.parse(bytes.toString()), verify(null, bytes, pub, Buffer.from(m[2], 'base64url')) ? 'signature OK' : 'BAD signature');
} else {
  console.log('Usage: node .dev/licence-key.mjs init | make <email> [v] | check <key>');
}
