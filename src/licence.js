// What is free and what needs a licence. Files, Parts, Favorites and taking parts to LUNA are
// free for good. The loops (New loop and everything that works on it: Fill, Arrange, Summary…)
// work for TRIAL_DAYS from the first run, and after that with a licence key. A deterrent, not a
// protection: the trial reads the computer's clock.
//
// Two kinds of key unlock the loops:
//
// - Gumroad keys ("6F0E4C97-B72A4E69-A11BF6C4-AF6517E7"), the ones buyers get. Gumroad sells
//   MIDI Digger (UA asked builders to sell through it) and emails the key. It is checked with
//   Gumroad's licence API (only the key and the product id are sent) when it is entered, and again
//   every RECHECK_DAYS. Each licence bought (a "seat") allows COMPUTERS_PER_SEAT computers: Gumroad
//   counts each activation (uses) and a key already on that many computers is refused. Without a
//   connection nothing is taken away; only Gumroad saying the purchase was refunded, charged back
//   or the key disabled removes it. (Gumroad's API lowers the count only with the seller's own
//   token, so "Remove from this computer" frees nothing there: .dev/gumroad-uses.mjs does, on
//   request.)
//
// - Signed keys ("MD1-…"), made by .dev/licence-key.mjs with a private key that never leaves the
//   author's computer: promotional keys (with a last day, x), reviewers' keys, keys given by hand.
//   The page holds only the public key, so they are checked without any connection. A key says
//   which major version it is for (v): this version accepts MAJOR and later. REVOKED lists key
//   ids that must no longer work.
//
// Where it is kept: luna.secrets (the OS credential store, scoped to the add-on id). It outlasts
// uninstalling and reinstalling, so reinstalling does not start a new trial (nor use another of
// a key's computers). The trial's start is also kept in the page's prefs; the earlier counts.

import { verifyAsync } from '@noble/ed25519';

export const TRIAL_DAYS = 7;
export const RECHECK_DAYS = 7;
export const COMPUTERS_PER_SEAT = 3;
const DAY = 864e5;

/** The major version: keys for it (or a later one) unlock the loops. */
export const MAJOR = 1;
/**
 * Where MIDI Digger is bought: the author's own page, which redirects to the shop (Gumroad). The
 * price or the shop change there, without an add-on update. Its source:
 * D:\UAUDIO\MIDI-Digger-web\mididigger\comprar\index.html.
 */
export const BUY_URL = 'https://elper.es/mididigger/comprar/';
/** MIDI Digger's product on Gumroad (not a secret: it only says which product a key is for). */
export const GUMROAD_PRODUCT_ID = '8EKCt1kcNbPJ-wZD_jxfUA==';
export const GUMROAD_VERIFY = 'https://api.gumroad.com/v2/licenses/verify';
/** The public half of the signing key (.dev/licence-key.mjs init), raw Ed25519, base64url. */
export const PUBLIC_KEY = 'R89Tgifm-DSmAxuKnD5TJE5SKkCMYXkwdMZFlXilsX0';
/** Signed key ids (the payload's n) that no longer unlock anything. */
export const REVOKED = new Set([]);

const KEYS = { start: 'mididigger.trial_start', seen: 'mididigger.last_seen', licence: 'mididigger.licence' };
const GUMROAD_KEY = /^[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/i;

/**
 * May the loops be used: { allowed, reason: 'licensed' | 'trial' | 'expired', daysLeft }.
 * `start` and `seen` are ms (the trial's first day, the latest time the add-on ran): a clock
 * put back does not give days back. `licence`: an activated key, or null.
 */
export function loopsAccess({ start = null, seen = null, licence = null, now = Date.now() } = {}) {
  if (licence) return { allowed: true, reason: 'licensed', daysLeft: null };
  if (start == null) return { allowed: true, reason: 'trial', daysLeft: TRIAL_DAYS };
  const t = Math.max(now, seen ?? 0);
  const daysLeft = Math.max(0, Math.ceil((start + TRIAL_DAYS * DAY - t) / DAY));
  return daysLeft > 0 ? { allowed: true, reason: 'trial', daysLeft } : { allowed: false, reason: 'expired', daysLeft: 0 };
}

export class LicenceError extends Error {}

/** "6F0E…17E7": enough of a key to recognise it. */
export const maskKey = (key) => (key.length > 12 ? `${key.slice(0, 4)}…${key.slice(-4)}` : key);

function fromB64u(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * A signed key's payload ({ p, v, e, d, n, x? }) when its signature is good and it is for this
 * product and version, else a LicenceError saying why not.
 */
export async function checkKey(rawKey, publicKey = PUBLIC_KEY, now = Date.now()) {
  const key = String(rawKey ?? '').replace(/\s+/g, '');
  if (!key) throw new LicenceError('Paste the licence key from your purchase email.');
  const m = /^MD1-([\w-]+)\.([\w-]+)$/.exec(key);
  if (!m) throw new LicenceError('This is not a MIDI Digger licence key. Copy the whole key from your purchase email.');
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
const isGumroadKey = (key) => GUMROAD_KEY.test(key);
const purchaseVoid = (p) => !!(p?.refunded || p?.chargebacked || p?.disputed);

/**
 * The licence of this computer. `secrets`: luna.secrets (get/set/delete, strings); `prefs`: the
 * page's prefs (get/set); `fetchImpl`: fetch (tests); `now`: the clock (tests); `publicKey`:
 * tests sign with their own.
 */
export function createLicence({ secrets, prefs, fetchImpl = (...a) => fetch(...a), now = () => Date.now(), publicKey = PUBLIC_KEY, productId = GUMROAD_PRODUCT_ID } = {}) {
  let state = { start: null, seen: null, licence: null };
  let loaded = false;

  const get = async (name) => { try { return await secrets.get(name); } catch { return null; } };
  const put = async (name, value) => { try { await secrets.set(name, value); } catch { /* this run only */ } };
  const drop = async (name) => { try { await secrets.delete(name); } catch { /* nothing kept */ } };
  const clock = () => Math.max(now(), state.seen ?? 0);

  /** Gumroad's answer about a key: { ok, data }, or a LicenceError when it cannot be reached. */
  async function gumroad(key, count) {
    let response;
    try {
      response = await fetchImpl(GUMROAD_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: count ? 'true' : 'false' }).toString(),
      });
    } catch {
      throw new LicenceError('Could not reach Gumroad to check the key. Check the internet connection and try again (once activated, MIDI Digger works offline).');
    }
    let data = null;
    try { data = await response.json(); } catch { /* not JSON */ }
    if (!data) throw new LicenceError(`Gumroad answered ${response.status} without a reply MIDI Digger can read. Try again later.`);
    return { ok: response.ok && data.success === true, data };
  }

  /** A Gumroad licence as kept: who bought it, how many seats, when it was last checked. */
  const gumroadLicence = (key, data) => {
    const seats = Math.max(1, num(data.purchase?.quantity) ?? 1);
    return { kind: 'gumroad', key, e: data.purchase?.email ?? '', d: String(data.purchase?.sale_timestamp ?? '').slice(0, 10), n: maskKey(key), v: MAJOR, seats, computers: seats * COMPUTERS_PER_SEAT, uses: num(data.uses), checked: now() };
  };

  async function activateGumroad(key) {
    // First without counting: refused keys, refunds and keys on too many computers use nothing up.
    const first = await gumroad(key, false);
    if (!first.ok) throw new LicenceError(/does not exist|not found/i.test(first.data.message ?? '') ? 'This key was not found for MIDI Digger. Copy it whole from your Gumroad receipt.' : `The key was not accepted: ${first.data.message ?? 'Gumroad refused it'}.`);
    if (purchaseVoid(first.data.purchase)) throw new LicenceError('This purchase was refunded or charged back, so its key no longer unlocks the loops.');
    const allowed = gumroadLicence(key, first.data).computers;
    if ((num(first.data.uses) ?? 0) >= allowed) {
      throw new LicenceError(`This key is already in use on ${first.data.uses} computers, and its ${allowed / COMPUTERS_PER_SEAT} licence${allowed > COMPUTERS_PER_SEAT ? 's allow' : ' allows'} ${allowed}. Buy more licences, or write to elper.es to free a computer you no longer use.`);
    }
    const counted = await gumroad(key, true);
    if (!counted.ok) throw new LicenceError(`The key was not accepted: ${counted.data.message ?? 'Gumroad refused it'}.`);
    return gumroadLicence(key, counted.data);
  }

  return {
    /** Read what is kept (a signed key is checked again); the first run starts the trial. */
    async load() {
      const t = now();
      const starts = [num(await get(KEYS.start)), num(prefs?.get(KEYS.start))].filter((v) => v != null);
      const start = starts.length ? Math.min(...starts) : t;
      const seen = Math.max(t, num(await get(KEYS.seen)) ?? 0, num(prefs?.get(KEYS.seen)) ?? 0);
      let licence = null;
      const kept = await get(KEYS.licence);
      if (kept?.startsWith('{')) {
        try { licence = JSON.parse(kept); } catch { /* unreadable: none */ }
        if (licence?.kind !== 'gumroad' || !licence.key) { licence = null; await drop(KEYS.licence); }
      } else if (kept) {
        // (A promotional key's last day is not checked here but in access(), which can then say it has ended.)
        try { licence = { kind: 'signed', ...(await checkKey(kept, publicKey, 0)), key: kept }; } catch { await drop(KEYS.licence); }
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
    /**
     * The activated key, or null: { kind: 'signed' | 'gumroad', key, e (email), n (number), d
     * (date), v, x? (a promotional key's last day), seats and computers (Gumroad) }.
     */
    get licence() { return state.licence; },
    /** As loopsAccess; a promotional key past its last day counts as none (`keyEnded`: it was one). */
    access() {
      const t = clock();
      if (state.licence && keyExpired(state.licence, t)) return { ...loopsAccess({ ...state, licence: null, now: t }), keyEnded: state.licence.x };
      const a = loopsAccess({ ...state, now: now() });
      return a.reason === 'licensed' ? { ...a, daysLeft: keyDaysLeft(state.licence, t) } : a;
    },

    /** A key typed in: a Gumroad key checked with Gumroad, a signed one here; a LicenceError says why not. */
    async activate(rawKey) {
      const key = String(rawKey ?? '').replace(/\s+/g, '');
      if (!key) throw new LicenceError('Paste the licence key from your purchase email.');
      if (isGumroadKey(key)) {
        const licence = await activateGumroad(key.toUpperCase());
        state.licence = licence;
        await put(KEYS.licence, JSON.stringify(licence));
      } else {
        const payload = await checkKey(key, publicKey, clock());
        state.licence = { kind: 'signed', ...payload, key };
        await put(KEYS.licence, key);
      }
      return this.access();
    },

    /**
     * Now and then (RECHECK_DAYS): is a Gumroad key still good? Only a clear "no" (refunded,
     * charged back, disabled, gone) removes it; without a connection, or with an answer it
     * cannot read, it stays. Returns true when it was removed.
     */
    async recheck() {
      const licence = state.licence;
      if (licence?.kind !== 'gumroad' || now() - (licence.checked ?? 0) < RECHECK_DAYS * DAY) return false;
      let answer;
      try { answer = await gumroad(licence.key, false); } catch { return false; }
      const { ok, data } = answer;
      const gone = !ok && /does not exist|not found|disabled/i.test(data.message ?? '');
      if (gone || (ok && purchaseVoid(data.purchase))) {
        state.licence = null;
        await drop(KEYS.licence);
        return true;
      }
      if (ok) {
        state.licence = { ...gumroadLicence(licence.key, data) };
        await put(KEYS.licence, JSON.stringify(state.licence));
      }
      return false;
    },

    /** Take the licence off this computer (the same key can be entered again later). */
    async deactivate() {
      state.licence = null;
      await drop(KEYS.licence);
    },
  };
}
