// Development only: how many computers a Gumroad key is on, and freeing one (a buyer who changed
// computer and asks for it). MIDI Digger counts each activation on Gumroad; the add-on cannot
// lower the count (that needs the seller's token), this script can.
//
//   node .dev/gumroad-uses.mjs show <key>        its uses, seats and buyer
//   node .dev/gumroad-uses.mjs free <key>        one use less (needs GUMROAD_TOKEN)
//
// GUMROAD_TOKEN: an access token of the seller's Gumroad account (Settings → Advanced →
// Applications: create one, "Generate access token"). It is a secret: set it in the console
// for that run only (PowerShell: $env:GUMROAD_TOKEN = '...'), never in a file of the project.

const PRODUCT_ID = '8EKCt1kcNbPJ-wZD_jxfUA==';
const API = 'https://api.gumroad.com/v2/licenses';
const [cmd, key] = process.argv.slice(2);
if (!['show', 'free'].includes(cmd) || !key) {
  console.log('Usage: node .dev/gumroad-uses.mjs show <key> | free <key>');
  process.exit(1);
}

async function call(path, method, fields) {
  const r = await fetch(`${API}/${path}`, { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString() });
  const data = await r.json().catch(() => ({}));
  if (!data.success) throw new Error(data.message || `Gumroad answered ${r.status}`);
  return data;
}

const show = (d) => {
  const seats = d.purchase?.quantity ?? 1;
  console.log(`${d.purchase?.email ?? '?'} · ${seats} licence(s), up to ${seats * 3} computers · in use on ${d.uses} · bought ${String(d.purchase?.sale_timestamp ?? '').slice(0, 10)}${d.purchase?.refunded ? ' · REFUNDED' : ''}`);
};

if (cmd === 'show') {
  show(await call('verify', 'POST', { product_id: PRODUCT_ID, license_key: key, increment_uses_count: 'false' }));
} else {
  const token = process.env.GUMROAD_TOKEN;
  if (!token) throw new Error('Set GUMROAD_TOKEN first (see the top of this file).');
  show(await call('decrement_uses_count', 'PUT', { access_token: token, product_id: PRODUCT_ID, license_key: key }));
  console.log('One computer freed.');
}
