// What is free and what needs a licence. Files, Parts, Favorites and taking parts to LUNA are
// free for good. The loops (New loop and everything that works on it: Fill, Arrange, Summary…)
// work for TRIAL_DAYS from the first run, and after that with a licence key bought at BUY_URL
// (Stripe). A deterrent, not a protection: the trial reads the computer's clock.
//
// Keys are signed (Ed25519) by .dev/licence-key.mjs with a private key that never leaves the
// author's computer; the page holds only the public key, so it checks a key without any
// connection, and nothing is sent anywhere. A key says which major version it is for (v): this
// version accepts keys for MAJOR and later. The buyer's email is in the key and shown once it is
// activated, which discourages passing it around. A promotional key also carries its last day
// (x, "YYYY-MM-DD"): after it the loops are locked again, as after the trial. REVOKED lists key ids that must no longer work
// (a refund, a key published online).
//
// Where it is kept: luna.secrets (the OS credential store, scoped to the add-on id). It outlasts
// uninstalling and reinstalling, so reinstalling does not start a new trial. The trial's start
// is also kept in the page's prefs, and the earlier of the two counts.

import { verifyAsync } from '@noble/ed25519';

export const TRIAL_DAYS = 15;
const DAY = 864e5;

/** The major version: keys for it (or a later one) unlock the loops. */
export const MAJOR = 1;
/**
 * Where MIDI Digger is bought: the author's own page, which redirects to the shop (Stripe Payment
 * Link). The price or the shop change there, without an add-on update. Its source:
 * D:\UAUDIO\MIDI-Digger-web\mididigger\comprar\index.html.
 */
export const BUY_URL = 'https://elper.es/mididigger/comprar/';
/** The public half of the signing key (.dev/licence-key.mjs init), raw Ed25519, base64url. */
export const PUBLIC_KEY = 'R89Tgifm-DSmAxuKnD5TJE5SKkCMYXkwdMZFlXilsX0';
/** Key ids (the payload's n) that no longer unlock anything. */
export const REVOKED = new Set([]);

const KEYS = { start: 'mididigger.trial_start', seen: 'mididigger.last_seen', licence: 'mididigger.licence' };

/**
 * May the loops be used: { allowed, reason: 'licensed' | 'trial' | 'expired', daysLeft }.
 * `start` and `seen` are ms (the trial's first day, the latest time the add-on ran): a clock
 * put back does not give days back. `licence`: a checked key's payload, or null.
 */
export function loopsAccess({ start = null, seen = null, licence = null, now = Date.now() } = {}) {
  if (licence) return { allowed: true, reason: 'licensed', daysLeft: null };
  if (start == null) return { allowed: true, reason: 'trial', daysLeft: TRIAL_DAYS };
  const t = Math.max(now, seen ?? 0);
  const daysLeft = Math.max(0, Math.ceil((start + TRIAL_DAYS * DAY - t) / DAY));
  return daysLeft > 0 ? { allowed: true, reason: 'trial', daysLeft } : { allowed: false, reason: 'expired', daysLeft: 0 };
}

export class LicenceError extends Error {}

function fromB64u(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * A key's payload ({ p, v, e, d, n }) when its signature is good and it is for this product and
 * version, else a LicenceError saying why not.
 */
export async function checkKey(rawKey, publicKey = PUBLIC_KEY, now = Date.now()) {
  const key = String(rawKey ?? '').replace(/\s+/g, '');
  if (!key) throw new LicenceError('Paste the licence key from your purchase email.');
  const m = /^MD1-([\w-]+)\.([\w-]+)$/.exec(key);
  if (!m) throw new LicenceError('This is not a MIDI Digger licence key. Copy the whole key, from MD1- to the end.');
  let bytes, payload, good = false;
  try {
    bytes = fromB64u(m[1]);
    payload = JSON.parse(new TextDecoder().decode(bytes));
    good = await verifyAsync(fromB64u(m[2]), bytes, fromB64u(publicKey));
  } catch { good = false; }
  if (!good || payload?.p !== 'mididigger') throw new LicenceError('This key is not valid. Check that it was copied whole.');
  if (REVOKED.has(payload.n)) throw new LicenceError('This key has been withdrawn. Write to elper.es if you think this is a mistake.');
  if (!(Number(payload.v) >= MAJOR)) throw new LicenceError(`This key is for MIDI Digger ${payload.v}; this is version ${MAJOR}. An upgrade key is needed.`);
  if (keyExpired(payload, now)) throw new LicenceError(`This key was valid until ${payload.x}. To keep using the loops, buy a licence.`);
  return payload;
}

/** A promotional key's last day (x, "YYYY-MM-DD", inclusive, local time) is past. Keys without x never expire. */
export function keyExpired(payload, now = Date.now()) {
  if (!payload?.x) return false;
  const [y, m, d] = String(payload.x).split('-').map(Number);
  return now > new Date(y, m - 1, d, 23, 59, 59).getTime();
}

/** Whole days left of a promotional key (its last day counts), or null for a key that never expires. */
export function keyDaysLeft(payload, now = Date.now()) {
  if (!payload?.x) return null;
  const [y, m, d] = String(payload.x).split('-').map(Number);
  return Math.max(0, Math.ceil((new Date(y, m - 1, d, 23, 59, 59).getTime() - now) / DAY));
}

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * The licence of this computer. `secrets`: luna.secrets (get/set/delete, strings); `prefs`: the
 * page's prefs (get/set); `now`: the clock (tests); `publicKey`: tests sign with their own.
 */
export function createLicence({ secrets, prefs, now = () => Date.now(), publicKey = PUBLIC_KEY } = {}) {
  let state = { start: null, seen: null, licence: null };
  let loaded = false;

  const get = async (name) => { try { return await secrets.get(name); } catch { return null; } };
  const put = async (name, value) => { try { await secrets.set(name, value); } catch { /* this run only */ } };
  const drop = async (name) => { try { await secrets.delete(name); } catch { /* nothing kept */ } };

  return {
    /** Read what is kept (a kept key is checked again); the first run starts the trial. */
    async load() {
      const t = now();
      const starts = [num(await get(KEYS.start)), num(prefs?.get(KEYS.start))].filter((v) => v != null);
      const start = starts.length ? Math.min(...starts) : t;
      const seen = Math.max(t, num(await get(KEYS.seen)) ?? 0, num(prefs?.get(KEYS.seen)) ?? 0);
      let licence = null;
      const kept = await get(KEYS.licence);
      if (kept) {
        // (Its last day is not checked here but in access(), which can then say the key has ended.)
        try { licence = { ...(await checkKey(kept, publicKey, 0)), key: kept }; } catch { await drop(KEYS.licence); }
      }
      state = { start, seen, licence };
      await put(KEYS.start, String(start));
      await put(KEYS.seen, String(seen));
      prefs?.set(KEYS.start, String(start));
      prefs?.set(KEYS.seen, String(seen));
      loaded = true;
      return this.access();
    },

    get loaded() { return loaded; },
    /** The activated key's payload and the key itself ({ e, v, d, n, key }), or null. */
    get licence() { return state.licence; },
    /** As loopsAccess; a promotional key past its last day counts as none (`keyEnded`: it was one). */
    access() {
      const t = Math.max(now(), state.seen ?? 0);
      if (state.licence && keyExpired(state.licence, t)) return { ...loopsAccess({ ...state, licence: null, now: t }), keyEnded: state.licence.x };
      const a = loopsAccess({ ...state, now: now() });
      return a.reason === 'licensed' ? { ...a, daysLeft: keyDaysLeft(state.licence, t) } : a;
    },

    /** A key typed in: checked here, no connection needed; a LicenceError says why not. */
    async activate(rawKey) {
      const key = String(rawKey ?? '').replace(/\s+/g, '');
      const payload = await checkKey(key, publicKey, Math.max(now(), state.seen ?? 0));
      state.licence = { ...payload, key };
      await put(KEYS.licence, key);
      return this.access();
    },

    /** Take the licence off this computer (to use it on another). */
    async deactivate() {
      state.licence = null;
      await drop(KEYS.licence);
    },
  };
}
