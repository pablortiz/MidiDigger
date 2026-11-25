# How MIDI Digger works

The details behind [MIDI Digger](https://github.com/pablortiz/MidiDigger): how it reads a MIDI
library, how it scores a fragment against the music, and how Fill chooses.

## 1. Analysing files and extracting fragments

**Per file**
- Split by MIDI channel. Each channel becomes a part with a role: drums (channel 10), bass,
  chords or melody.
- Key: the key signature written in the file; when there is none (or it is the default
  C major), Krumhansl-Kessler correlation over the 24 keys.
- Tempo and meter from the file, any meter: bars follow the file's time-signature changes.

**Fragments**
- Each part is cut at its silences: every group of notes between rests is a candidate fragment.
- Loops are found with a bar-by-bar self-similarity matrix (every bar compared with every
  other). Repeated bars collapse into one loop with a repeat count.
- Duplicates within a part count once. Fragments of 1 to 16 bars are kept.

**Saving the analysis.** *Data → Save analysis* stores every fragment with its role, length,
tempo, key, and the note and hit summaries the fit measures are worked out from. Ticking
*Include MIDI events* also stores each fragment's notes, volume, pan, sustain, pitch bend and
tempo. *Restore* brings a saved analysis back without analysing again, adding its files to
those already analysed. *Clear analysis* forgets it all (the list of files, favourites and
loops stay), so a library can be kept as several saved analyses, one per range of folders, and
switched between with *Clear analysis* and *Restore*. In *Files*, **Analysed** shows only the
files already analysed.

## 2. How a fragment is scored against the music

Each candidate is compared with what is playing on 9 measures, each multiplied by its weight,
plus a fixed value. The result goes through a logistic function: a 0 to 1 chance that the
fragment was written for that music. Weights for bass, chords and melody; drums use rhythm only.

| Measure | What it measures | Weight | Drums |
|---|---|---:|---:|
| clash | semitone clashes (up or down) when both sound | −3.52 | – |
| chroma | same pitch classes, bar by bar | +4.52 | – |
| harmonyCover | fragment notes on the context's notes | +0.15 | – |
| hit | fragment hits landing with the context's (±1) | +0.08 | +0.72 |
| cover | context hits the fragment also plays | +0.06 | +1.04 |
| beat | same split of the beat (straight / swing / triplets) | +2.88 | +3.69 |
| accent | same places of the bar struck | −1.09 | −1.79 |
| bar | moving together, bar by bar | +2.45 | +1.82 |
| density | how many more hits per bar (in octaves) | +0.23 | +0.14 |
| fixed value | | −4.32 | −3.90 |

The weights were learned by logistic regression from 3,000 songs: real combinations (parts
that were written together) against random ones. On songs it had not seen, it tells them
apart with an AUC of 0.86 for parts with notes and 0.73 for drums.

## 3. How Fill chooses

Each candidate gets five sub-scores from 0 to 1, combined with fixed weights:

**Fill % = 45 % Fit + 25 % Length + 15 % Dynamics + 5 % Activity + 10 % Role**

| Part | Weight | What it measures |
|---|---:|---|
| Fit | 45 % | the 9 measures above: notes and rhythm against what the loop plays |
| Length | 25 % | how much of the target bars the fragment fills |
| Dynamics | 15 % | how close its note velocities are to the loop's |
| Activity | 5 % | how close its note density is to the loop's |
| Role | 10 % | how often this instrument goes with the loop's instruments, learned from your analysed songs |

The best-scoring fragments of each instrument become its playlist (▶▶), so you can hear the
alternatives in turn and keep the one you like.

## 4. What Fill does to a fragment it puts in

Every fragment Fill (or Rotate, a playlist, ⇣ or ⇲) puts in the loop is:

- **moved to the loop's key**;
- **adapted to the chords there**: the few notes that clash are moved a step;
- **played as the pads it replaces were played**: their swing, velocity and octave are kept.

The log shows it in a table, a column for each of these, so you can see what was changed.

When several zones are selected (Ctrl + click), Fill fills them one after another: the base
first (drums, bass, chords, then melodies; the longer before the shorter), each going with the
ones filled before it.
