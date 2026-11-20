// Fill provenance is kept on clips, independently of explicit compatibility votes.

export function clipMusic(clip) {
  const { bars, beats, notes, chords, chordsBase, key, transpose, shift, swing, swingGrid, vel, mode, pickup } = clip;
  return { bars, beats, notes, chords, chordsBase, key, transpose, shift, swing, swingGrid, vel, mode, pickup };
}

export function mergeFillOrigins(clips) {
  const origins = new Map();
  for (const clip of clips) for (const origin of clip.fillOrigins ?? []) {
    if (!origins.has(origin.id)) origins.set(origin.id, { ...origin, base: undefined, modified: true });
  }
  return [...origins.values()];
}

export function baselineFill(row, id) {
  for (const clip of row.clips.values()) {
    if (!clip.fillOrigins?.some((origin) => origin.id === id)) continue;
    clip.fillOrigins = clip.fillOrigins.map((origin) =>
      origin.id === id ? { ...origin, base: structuredClone(clipMusic(clip)) } : origin);
  }
}

/** One entry per Fill decision, with all surviving placements, including silent ones. */
export function retainedFill(loop) {
  const found = new Map();
  const solo = loop.rows.some((row) => row.solo && !row.mute);
  for (const row of loop.rows) for (const [at, clip] of row.clips) {
    const end = Math.min(at + clip.bars, loop.length ?? Infinity);
    if (end <= at || !clip.notes?.some((note) => note.beat < (end - at) * (clip.beats ?? 4))) continue;
    for (const origin of clip.fillOrigins ?? []) {
      if (!origin?.id) continue;
      let item = found.get(origin.id);
      if (!item) {
        item = { id: origin.id, candidate: origin.candidate, context: origin.context, modified: false, placements: [] };
        found.set(origin.id, item);
      }
      const offBars = (row.off ?? []).filter((bar) => bar >= at && bar < end);
      const modified = !!origin.modified || !origin.base || JSON.stringify(clipMusic(clip)) !== JSON.stringify(origin.base);
      item.modified ||= modified;
      item.placements.push({ row: row.name, program: row.program, at, bars: end - at, modified,
        muted: !!row.mute, excludedBySolo: !!(solo && !row.solo), offBars });
    }
  }
  return [...found.values()];
}

export function mergeConfirmations(existing, incoming) {
  const all = new Map(existing.map((record) => [record.id, record]));
  for (const record of incoming) {
    if (!record || typeof record.id !== 'string' || typeof record.loopId !== 'string'
      || typeof record.at !== 'string' || record.loop?.app !== 'MIDI Digger loop'
      || !Array.isArray(record.loop.rows) || !Array.isArray(record.fill)) {
      throw new Error('The loop confirmations in this backup are invalid.');
    }
    if (!all.has(record.id)) all.set(record.id, record);
  }
  return [...all.values()];
}
