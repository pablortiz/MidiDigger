const PITCHES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function copyFingerprintGrid(values, stepsPerBar) {
  if (!values?.length || !Number.isInteger(stepsPerBar) || stepsPerBar <= 0) return null;
  return { values: Array.from(values), stepsPerBar };
}

export function fingerprintBars(grid, kind) {
  if (!grid) return [];
  const { values, stepsPerBar } = grid;
  const bars = [];
  for (let from = 0; from < values.length; from += stepsPerBar) {
    const steps = values.slice(from, from + stepsPerBar);
    if (kind === 'pitch') {
      bars.push(steps.map((mask, i) => {
        const notes = PITCHES.filter((_, n) => mask & (1 << n));
        return notes.length ? `${i + 1}:${notes.join('+')}` : '';
      }).filter(Boolean).join(' ') || '–');
    } else {
      bars.push(steps.flatMap((hit, i) => hit ? [i + 1] : []).join(' ') || '–');
    }
  }
  return bars;
}
