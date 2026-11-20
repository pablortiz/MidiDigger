// Where an audio track strikes, from its loudness envelope (LUNA's waveform overview: the peak
// of each 2.6 ms, 384 a second): a hit is where the level jumps well above what came just
// before. Enough for the groove of a drum or a bass track (when it strikes), not for its notes.

const BEFORE_S = 0.02;     // the level a hit rises above: the mean of this long before it
const PEAK_S = 0.03;       // a hit is the biggest rise within this either side
const GAP_S = 0.05;        // two hits are at least this far apart (a 32nd at 150 BPM)
const RISE_MIN = 0.02;     // a rise smaller than this (of full scale) is never a hit
const RISE_SHARE = 0.25;   // nor one smaller than this share of the track's biggest rises

/**
 * The hits in an envelope (peaks 0-1, `perSecond` of them a second): [{ sec, strength }] in time
 * order, `strength` the rise (0-1). Quiet or steady audio (a pad) gives few or none.
 */
export function onsetsOf(envelope, perSecond) {
  const n = envelope.length;
  const before = Math.max(1, Math.round(BEFORE_S * perSecond));
  const peak = Math.max(1, Math.round(PEAK_S * perSecond));
  const gap = Math.max(1, Math.round(GAP_S * perSecond));
  // The rise at each point over the level just before it (at the very start, over silence: a
  // hit on the first beat counts).
  const rise = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    rise[i] = Math.max(0, envelope[i] - (i ? sum / Math.min(i, before) : 0));
    sum += envelope[i];
    if (i >= before) sum -= envelope[i - before];
  }
  // A threshold of its own: a quarter of its biggest rises (their 95th percentile), so a quiet
  // track and a loud one are read alike.
  const sorted = [...rise].filter((r) => r > 0).sort((a, b) => a - b);
  const top = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const threshold = Math.max(RISE_MIN, top * RISE_SHARE);
  const hits = [];
  let last = -Infinity;
  for (let i = 0; i < n; i++) {
    const r = rise[i];
    if (r < threshold || i - last < gap) continue;
    let biggest = true;
    for (let k = Math.max(0, i - peak); k <= Math.min(n - 1, i + peak) && biggest; k++) if (rise[k] > r) biggest = false;
    if (!biggest) continue;
    // At the very start there was nothing before to rise from: a hit only if it is seen rising
    // from near silence there (an attack, even of a note then held), or it then dies away as a
    // hit does. A sound held from before the stretch does neither.
    if (i < before && envelope[0] >= envelope[i] * 0.5) {
      const later = envelope[Math.min(n - 1, i + Math.round(0.1 * perSecond))];
      if (later > envelope[i] * 0.7) continue;
    }
    hits.push({ sec: i / perSecond, strength: r });
    last = i;
  }
  return hits;
}

/**
 * Of a track's hits, those that make its groove: the strong ones (kick and snare over the
 * hi-hats, as the MIDI tracks' groove keeps only kick and snare), half its loudest at least.
 */
export function strongHits(hits) {
  const max = Math.max(0, ...hits.map((h) => h.strength));
  return hits.filter((h) => h.strength >= max * 0.5);
}
