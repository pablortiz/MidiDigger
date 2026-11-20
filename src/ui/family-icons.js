// A drawing of each General MIDI family, in GM_FAMILIES' order: line art on a 24 box that takes
// the colour of its button.

const ICONS = [
  // Piano: keys
  '<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M7 12v6M12 12v6M17 12v6"/><path fill="currentColor" stroke="none" d="M5.5 6h3v6h-3zM10.5 6h3v6h-3zM15.5 6h3v6h-3z"/>',
  // Chromatic percussion: the bars of a xylophone
  '<path stroke-width="3" d="M4 4v16M9 5.5v13M14 7v10M19 8.5v7"/><path stroke-width="1" d="M1 8l22 1.5M1 16l22-1.5"/>',
  // Organ: pipes
  '<path stroke-width="2.6" d="M4 20v-8M8 20V8M12 20V4M16 20V8M20 20v-8"/><path d="M2 21.5h20"/>',
  // Guitar
  '<circle cx="8.5" cy="16" r="5"/><circle cx="12.5" cy="11.5" r="3"/><circle cx="9" cy="15.5" r="1" fill="currentColor"/><path d="M14.5 9.5l6-6M19 2l3 3"/>',
  // Bass: a small body, a long neck, four pegs
  '<circle cx="6.5" cy="17.5" r="3.8"/><circle cx="9.5" cy="14.5" r="2"/><path d="M11 13L21.5 2.5M17 3.5l1.5 1.5M19 1.5l1.5 1.5M20 7l1.5 1.5M18 5l1.5 1.5"/>',
  // Strings: a violin
  '<path d="M9 9c-2 1-1 3 0 4-2 1-3 3-2 5 1 3 9 3 10 0 1-2 0-4-2-5 1-1 2-3 0-4-1-.6-5-.6-6 0z"/><path d="M12 2v15M10 2.5h4"/>',
  // Ensemble and choir: people
  '<circle cx="12" cy="8" r="3"/><path d="M6 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="4.5" cy="10.5" r="2"/><circle cx="19.5" cy="10.5" r="2"/><path d="M1.5 19c0-3 1.200-4.500 3-4.500M22.500 19c0-3-1.200-4.500-3-4.500"/>',
  // Brass: a trumpet
  '<path d="M2 10v4M2 12h13l7-5v10l-7-5M6 12v4h7v-4M8 12V8M11 12V8"/>',
  // Reed: a saxophone
  '<path stroke-width="2.4" d="M6 3l4 2.500V15a4.500 4.500 0 0 0 9 0v-3"/><path d="M15.500 11.500h7"/><circle cx="13.500" cy="14" r=".8" fill="currentColor"/>',
  // Pipe: a flute
  '<g transform="rotate(-30 12 12)"><rect x="1" y="10" width="22" height="4" rx="1"/><path stroke-width="1.600" d="M7 12h.01M11 12h.01M14 12h.01M17 12h.01"/></g>',
  // Synth lead: a saw wave
  '<path d="M2 17L8 7v10l6-10v10l6-10v10"/>',
  // Synth pad: a soft cloud
  '<path d="M7 18a4 4 0 0 1-.5-8 5.500 5.500 0 0 1 10.600-1A4.500 4.500 0 0 1 17 18z"/>',
  // Synth FX: sparks
  '<path d="M11 5l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 2v4M17 4h4"/>',
  // Ethnic: a banjo
  '<circle cx="9" cy="15" r="6"/><circle cx="9" cy="15" r="1.400"/><path d="M13.500 10.500L21 3M18.500 2l3.500 3.500"/>',
  // Percussive: a drum and its sticks
  '<ellipse cx="12" cy="11" rx="8" ry="3"/><path d="M4 11v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6M8.500 7.500L4.500 2.500M15.500 7.500l4-5"/>',
  // Sound effects: a speaker
  '<path d="M3 9v6h4l5 4V5L7 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
];

const svg = (shape) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;

export const FAMILY_ICONS = ICONS.map(svg);

// What a part plays: the values of the role filter.
export const ROLE_ICONS = [
  // Drums: a kit, the kick with a cymbal over it
  ['drums', 'Drums', '<circle cx="12" cy="15.500" r="5.500"/><circle cx="12" cy="15.500" r="1.400"/><path d="M3.500 6.500V21M20.500 6.500V21M.8 8l5.400-3M17.800 5l5.400 3M9 7.500h6"/>'],
  // Bass: the bass clef
  ['bass', 'Bass', '<path d="M4 9a5.500 5.500 0 0 1 11 .5c0 5-5 9-11 11"/><circle cx="6" cy="9.500" r="1.600" fill="currentColor"/><path stroke-width="2.400" d="M19.500 7h.01M19.500 12.500h.01"/>'],
  // Chords: two of them, three notes stacked on each stem
  ['chords', 'Chords', '<path d="M9 20V3l11.500 0V20"/><g fill="currentColor" stroke="none"><ellipse cx="6.500" cy="9" rx="2.600" ry="2"/><ellipse cx="6.500" cy="14.500" rx="2.600" ry="2"/><ellipse cx="6.500" cy="20" rx="2.600" ry="2"/><ellipse cx="18" cy="9" rx="2.600" ry="2"/><ellipse cx="18" cy="14.500" rx="2.600" ry="2"/><ellipse cx="18" cy="20" rx="2.600" ry="2"/></g>'],
  // Melody: a line of notes
  ['melody', 'Melody', '<path d="M9 18V6l10-2v12"/><ellipse cx="6.500" cy="18" rx="2.500" ry="2" fill="currentColor"/><ellipse cx="16.500" cy="16" rx="2.500" ry="2" fill="currentColor"/>'],
].map(([value, name, shape]) => ({ value, name, icon: svg(shape) }));

/** The drawing of what plays: the drum kit, or the family of its General MIDI program. */
export function instrumentSvg(drums, program = 0) {
  if (drums) return ROLE_ICONS[0].icon;
  return FAMILY_ICONS[Math.max(0, Math.min(15, Math.floor((program ?? 0) / 8)))];
}
