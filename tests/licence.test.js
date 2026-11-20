import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MAJOR, PUBLIC_KEY, TRIAL_DAYS, checkKey, createLicence, loopsAccess } from '../src/licence.js';

const DAY = 864e5;
const T0 = Date.UTC(2026, 10, 20, 12);
const PAST = (TRIAL_DAYS + 3) * DAY;   // well after the trial

// A key pair of the tests' own, signing keys as .dev/licence-key.mjs does.
const pair = generateKeyPairSync('ed25519');
const PUB = pair.publicKey.export({ format: 'jwk' }).x;
const b64u = (b) => Buffer.from(b).toString('base64url');
function makeKey(payload = {}, privateKey = pair.privateKey) {
  const bytes = Buffer.from(JSON.stringify({ p: 'mididigger', v: MAJOR, e: 'buyer@example.com', d: '2026-11-20', n: 'abc123', ...payload }));
  return `MD1-${b64u(bytes)}.${b64u(sign(null, bytes, privateKey))}`;
}

function memory(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); } };
}
function prefsOf(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { m, get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v) };
}

describe('loopsAccess', () => {
  it('gives the trial its days, then locks; a licence always opens', () => {
    expect(loopsAccess({ start: T0, now: T0 })).toEqual({ allowed: true, reason: 'trial', daysLeft: TRIAL_DAYS });
    expect(loopsAccess({ start: T0, now: T0 + (TRIAL_DAYS - 0.5) * DAY }).daysLeft).toBe(1);
    expect(loopsAccess({ start: T0, now: T0 + TRIAL_DAYS * DAY + 1 })).toMatchObject({ allowed: false, reason: 'expired' });
    expect(loopsAccess({ start: T0, now: T0 + 99 * DAY, licence: { e: 'x' } })).toMatchObject({ allowed: true, reason: 'licensed' });
  });

  it('does not give days back when the clock is put back', () => {
    expect(loopsAccess({ start: T0, seen: T0 + (TRIAL_DAYS + 1) * DAY, now: T0 + DAY }).allowed).toBe(false);
  });
});

describe('checkKey', () => {
  it('accepts a well signed key and reads it', async () => {
    expect(await checkKey(makeKey(), PUB)).toMatchObject({ p: 'mididigger', v: MAJOR, e: 'buyer@example.com' });
    // Pasted from an email: spaces and line breaks are left out.
    const key = makeKey();
    expect((await checkKey(`  ${key.slice(0, 40)}\n${key.slice(40)} `, PUB)).e).toBe('buyer@example.com');
  });

  it('refuses keys signed by another key, altered, of another product or an older version', async () => {
    const other = generateKeyPairSync('ed25519').privateKey;
    await expect(checkKey(makeKey({}, other), PUB)).rejects.toThrow(/not valid/);
    const key = makeKey();
    const [head, sig] = key.split('.');
    const forged = `MD1-${b64u(Buffer.from(JSON.stringify({ p: 'mididigger', v: 9, e: 'thief@example.com', d: '2026-11-20', n: 'x' })))}.${sig}`;
    await expect(checkKey(forged, PUB)).rejects.toThrow(/not valid/);
    await expect(checkKey(`${head}.${sig.slice(0, -2)}AA`, PUB)).rejects.toThrow(/not valid/);
    await expect(checkKey(makeKey({ p: 'other' }), PUB)).rejects.toThrow(/not valid/);
    await expect(checkKey(makeKey({ v: MAJOR - 1 }), PUB)).rejects.toThrow(/upgrade key/);
    expect((await checkKey(makeKey({ v: MAJOR + 1 }), PUB)).v).toBe(MAJOR + 1);   // a later version's key works too
    await expect(checkKey('hello', PUB)).rejects.toThrow(/not a MIDI Digger licence key/);
    await expect(checkKey('  ', PUB)).rejects.toThrow(/Paste/);
  });

  it('the shipped public key is a 32-byte Ed25519 key', () => {
    expect(Buffer.from(PUBLIC_KEY, 'base64url')).toHaveLength(32);
  });
});

describe('createLicence', () => {
  it('starts the trial on the first run and keeps it across runs', async () => {
    const secrets = memory();
    const prefs = prefsOf();
    let now = T0;
    expect((await createLicence({ secrets, prefs, now: () => now, publicKey: PUB }).load()).daysLeft).toBe(TRIAL_DAYS);
    now = T0 + 3 * DAY;
    expect((await createLicence({ secrets, prefs, now: () => now, publicKey: PUB }).load()).daysLeft).toBe(TRIAL_DAYS - 3);
  });

  it('a reinstall (empty prefs) or cleared secrets do not restart the trial', async () => {
    const now = () => T0 + (TRIAL_DAYS + 1) * DAY;
    expect((await createLicence({ secrets: memory({ 'mididigger.trial_start': String(T0) }), prefs: prefsOf(), now, publicKey: PUB }).load()).allowed).toBe(false);
    expect((await createLicence({ secrets: memory(), prefs: prefsOf({ 'mididigger.trial_start': String(T0) }), now, publicKey: PUB }).load()).allowed).toBe(false);
  });

  it('activates a key, keeps it, and removes it', async () => {
    const secrets = memory({ 'mididigger.trial_start': String(T0) });
    const now = () => T0 + PAST;
    const l = createLicence({ secrets, prefs: prefsOf(), now, publicKey: PUB });
    expect((await l.load()).allowed).toBe(false);
    await expect(l.activate('nonsense')).rejects.toThrow();
    expect(l.access().allowed).toBe(false);
    expect((await l.activate(makeKey())).reason).toBe('licensed');
    expect(l.licence.e).toBe('buyer@example.com');

    const again = createLicence({ secrets, prefs: prefsOf(), now, publicKey: PUB });
    expect((await again.load()).reason).toBe('licensed');
    await again.deactivate();
    expect(secrets.m.has('mididigger.licence')).toBe(false);
    expect(again.access().allowed).toBe(false);
  });

  it('a promotional key works until its last day, then the loops lock and it says so', async () => {
    const secrets = memory({ 'mididigger.trial_start': String(T0) });
    const lastDay = new Date(T0 + PAST + 2 * DAY);
    const x = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    let now = T0 + PAST;
    const l = createLicence({ secrets, prefs: prefsOf(), now: () => now, publicKey: PUB });
    await l.load();
    const a = await l.activate(makeKey({ x }));
    expect(a).toMatchObject({ allowed: true, reason: 'licensed' });
    expect(a.daysLeft).toBeGreaterThanOrEqual(2);
    expect(a.daysLeft).toBeLessThanOrEqual(3);

    now = T0 + PAST + 4 * DAY;   // past its last day: kept, but no longer opens the loops
    const later = createLicence({ secrets, prefs: prefsOf(), now: () => now, publicKey: PUB });
    expect(await later.load()).toMatchObject({ allowed: false, reason: 'expired', keyEnded: x });
    await expect(later.activate(makeKey({ x }))).rejects.toThrow(/valid until/);
    // A key that never ends, bought afterwards, takes its place.
    expect((await later.activate(makeKey())).daysLeft).toBeNull();
  });

  it('drops a kept key that no longer checks', async () => {
    const secrets = memory({ 'mididigger.trial_start': String(T0), 'mididigger.licence': makeKey({}, generateKeyPairSync('ed25519').privateKey) });
    const l = createLicence({ secrets, prefs: prefsOf(), now: () => T0 + PAST, publicKey: PUB });
    expect((await l.load()).reason).toBe('expired');
    expect(secrets.m.has('mididigger.licence')).toBe(false);
  });
});
