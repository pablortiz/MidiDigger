# MIDI Digger

Copyright (c) 2026 elper.es (Pablo Ortiz). All rights reserved. This repository is private and
shared with Universal Audio only so it can review the add-on. It is not open source: see
`LICENSE.txt`. Third-party components keep their own licences (`THIRD-PARTY-NOTICES.txt`).

## For reviewers

- **Install without building:** the repository already holds a built copy (`dist/`,
  `vendor/luna.global.js`). Copy the folder, without `.git`, to LUNA's Add Ons folder, or pack it
  with `ua-builder pack` (or `npm run pack`).
- **Build from source:** `npm install --ignore-scripts`, then `npm test` and `npm run build`.
  `package.json` expects the LUNA Builder SDK in a folder `../LUNA Builder SDK` beside this one
  (`file:` dependency); change that path to wherever your SDK copy is.
- **Trying it:** the add-on ships no MIDI library. Choose any folder of `.mid` files and press
  **Analyse**. The preview uses the bundled GeneralUser GS soundfont.
- **Licence:** Files, Parts and Favorites are free. The loop features (New loop, Fill, Arrange,
  Summary) work for a 7-day trial from the first run, then need a licence key
  (`src/licence.js`: Ed25519-signed keys, checked offline; nothing is sent anywhere). A review
  key can be provided on request.
- Requires LUNA 3.1.1 or later (tested on Windows).

A LUNA Add On, built with `@uaudio/luna-builder-sdk`, for working with a large MIDI library
inside LUNA: browse it, search a catalogue of **parts** (one channel of one file) by role,
instrument, tempo, meter, key and repeating loops, listen to a part, a bar range or a loop,
and bring it to the session as a new instrument track.

In New loop's Explore timeline, the **Fragments** checkbox shows or hides fragment
regions without changing the notes or the selected loop. Hidden fragments cannot be clicked.
Creating a new loop keeps the current library tab and its Parts results in place.
Click track names to select or deselect several tracks for the same time range; the selected
tracks play together, alone or over the loop. The latter needs a free MIDI channel per pitched
track; if there are not enough, remove loop rows or select fewer tracks. A track's play button
selects and plays that track alone. Dragging multiple selected tracks onto a pad
creates new rows starting at that bar; drums reuse the drums row, replacing its affected bars.
The loop expands if necessary (up to 32 bars); selections that cannot fit are rejected.
Tracks with no notes in the selected range are skipped and reported in the log.
**Loop from song** rearranges and concatenates fragments from the explored song, with changing
rests on repeated presses. Pitched fragments can come from different song tracks and use the
receiving row's instrument; drums remain separate. Candidates are ranked with Fill's score,
using the measures available in the current musical context. Locked rows stay unchanged and
their source tracks are not reused.
After **Fill**, open the **Fill details** tab (left panel) to see the chosen fragment's combined score and the available
Fit, Length, Dynamics, Activity and Role measures with their effective weights. Missing measures
are marked unavailable and the other weights are redistributed. The comparison context shows the
Fit target (the loop or 🎯 LUNA session), the loop rows before Fill, duration, dynamics, activity,
role reference, key, chords and groove where available. Each candidate's 🧮 shows its corresponding
indexed facts and the Fit evidence used. Expand the note and rhythm grids to inspect their
per-bar steps; pitched candidate grids are shown transposed when they were compared that way.
For selected pads, Fit uses the loop with those pads removed, while dynamics and activity use the
original selected row and bars; earlier replacement choices can add a separate clash check.
Up to 49 eligible alternatives
from the same decision are shown; ▶ stops loop playback and plays the original fragment alone at
the loop tempo through the global Sound, without changing the loop. Leaving the tab stops the preview.
Each result also shows a MIDI piano roll of the fragment as auditioned in the loop key, before
Fill's note adaptation; unavailable source files are reported in place of the grid.
Scores reflect the selection before note adaptation, and alternatives may not
have been tried or readable. **Fill details** shows the most recent decision for that loop tab;
it is a snapshot, not a recalculation after later edits. The coloured Parts percentage is Fit only.
The **Summary** tab ranks the analysed library against the open loop using the same live Fill
calculation. It groups eligible fragments by instrument, showing the best score and the number
with at least 70% Fill, and reports the strongest bar lengths and tempo ranges. The bar filter
applies to the counts as well as the results. Summary always compares against the whole loop and
offers unused instruments to add as new rows, regardless of selected pads. Every result
can be auditioned. Adding one keeps Summary open and recalculates it against the updated loop;
the selected fragment's dimensions and evidence remain available in its Fill details tab. The
count covers all eligible indexed fragments with measurable Fit, not just the
displayed best results. Summary is recalculated rather than based on votes or previous choices.
Active Fill playlists advance together at each loop boundary, regardless of fragment length; each
returns to its first proposal after its last. Locked rows and playlists set to repeat stay on the
current proposal. Short fragments repeat within the loop; longer ones are cut to fit. Manual
playlist controls still change on the next beat or bar. Save chain lays the proposals heard
through a boundary in order using their original lengths, rather than recording the loop playback.
The pattern buttons first arrange the existing fragments, then try compatible library alternatives
using Fill's score: 45% fit, 25% length, 15% dynamics, 5% activity and 10% role. When a measure is
unavailable, the available measures are reweighted. Locked rows stay unchanged in both steps; when
no suitable replacement is found, the existing fragment remains in the arrangement.
**Align left** and **Align right** move the selected pads' notes together to the start or end of
the selection, preserving their audible rhythm and timing between tracks. Swing and velocity
settings are rendered into the notes; alignment can be undone. Turn selected pads on first, and
select the whole duration of notes crossing the selection's boundaries. Alignment is refused
without changing the loop if it cannot preserve the notes, including when a selected track has
fragments in different source keys.
Select one or more loop pads and press **Delete** to empty them; undo restores them.
Use **Hide tools** at the bottom right of the loop toolbar to make more room for the pads;
**Show tools** restores the buttons. Tempo, meter, key, length and LUNA sync remain available.

In New loop, press **♪** on a row to choose its sound: the global **Sound** setting, a
searchable preset from the current SoundFont (with a GM program-family filter), or an existing LUNA instrument track. SoundFont
drum rows list drum kits; changing the sound does not change the original instrument used by
Fill and Arrange. A LUNA track can be assigned to only one row, and its plugin and preset are
not changed. A track used by default-sound rows cannot also be assigned explicitly. Sound changes are undoable and saved with the loop. If the SoundFont or the
original session/track is unavailable, the row is silent and the log explains how to choose
it again. LUNA track assignments send MIDI live and can affect that track's MIDI controllers.
Audio export uses the selected SoundFont presets, but cannot render rows assigned to LUNA
tracks: choose MIDI-only export or change those rows to SoundFont. MIDI export does not embed
SoundFonts or plugins; the receiving instrument determines its sound.

Everything runs in the add-on page and ships as one `.lunaaddon`; nothing else needs
installing. Data lives in the page's IndexedDB, named after the add-on id.

| Path | Purpose |
|---|---|
| `manifest.json` | What LUNA reads: id, name, window size, entry page. See the SDK's `docs/MANIFEST.md`. |
| `index.html` | The page: `vendor/luna.global.js`, then `dist/main.js` and `dist/main.css`. |
| `src/midi/` | `parser.js` (SMF, tempo and meter maps), `parts.js` (notes of a part, bar ranges, play timelines), `features.js` (role, density, loop detection, the catalogue record), `gm.js`. No DOM, no LUNA. |
| `src/library/` | `scanner.js` (walk a folder with `luna.gui.listFiles`), `reader.js` (authorised folder, `file://` or helper server), `store.js` (IndexedDB), `catalog.js` (typed-column search), `indexer.js` (background analysis, pausable). |
| `src/preview/player.js` | Web Audio preview: all or some channels, silences skipped, looping ranges. |
| `src/luna/bridge.js` | Everything that talks to LUNA: parts to new tracks, whole-file import, instrument slots. |
| `src/ui/` | Panels: virtual table, divider, selected-file panel, instrument tools, log. |
| `src/main.js` | Entry point: wires it all. `globalThis.MidiLibraryDebug` exposes live state for the web inspector. |
| `dist/` | What `npm run build` makes from `src/`: one classic script (Windows loads add-ons from `file://`, where module scripts are blocked). Not hand-edited. |
| `tests/` | Vitest: MIDI and library logic, and the LUNA side against `Luna.MockEngine`. |
| `.dev/midi-server.mjs` | Development only (not packed): serves `.mid` bytes to a plain browser, where `file://` is refused. |

```sh
npm install --ignore-scripts   # the file: SDK dependency would otherwise try to rebuild itself
npm test                       # no LUNA needed
npm run build                  # src/ -> dist/
npm run install-addon          # build, then copy into LUNA's Add Ons folder (reopen the window)
npm run pack                   # build, then the .lunaaddon file to share
```

On Windows, `iniciar-servidor-midi.bat` starts the optional helper for `D:\midi`.
Keep its window open while using it and press Ctrl+C to stop it. The helper is
for development and is not included in the add-on; other local web pages can
request supported files under that folder while it is running.

### Direct access to the MIDI library

After choosing or restoring a library, press **Allow MIDI access** and select the
exact folder shown in Files. Confirm its full path; the browser provides only the
selected folder's name, not its full path. Where saved fingerprints are available,
MIDI Digger also checks a sample against the existing analysis. This does not
re-scan or erase the catalogue. A missing or changed sample may prevent verification;
the existing library is left untouched if verification fails.

The folder reference is saved in IndexedDB when the browser supports it. After
restarting LUNA, press **Reconnect MIDI access** and grant permission again if
requested. When the saved library cannot be read at startup, a dialog offers this
action; it can be dismissed and the toolbar button used later. If storage was cleared, choose the folder again. If the browser does
not support folder access, `file://` and the optional helper remain alternatives.
Files outside the library, including soundfonts, continue to use those alternatives.
Saved loops (`.json`) and saved analyses (`.mdig`) are selected and read
directly through the file picker, without the helper server. Older JSON analysis
backups cannot be restored; analyse the library again and save a `.mdig` instead.

**Analyse** calculates Search gesture scores as each MIDI is analysed, so matching
fragments become searchable during the run. Previously analysed files without scores
are read again; their saved fingerprint and fragment positions are checked before
updating the catalogue. When an older analysis has no fingerprint, MIDI Digger warns
that unchanged contents cannot be verified. Compact scores are stored without MIDI
events; a backup with events remains optional.
Parts lists analysed parts even before a query, with text, role, instrument,
gesture, length, meter, key, file BPM, energy and repetition filters. It can sort by
Fit, Fill %, tempo, fragment length or a shuffled order. Without a comparison target,
Fit and Fill % use file order or gesture score.
Note previews and playback read the original MIDI on demand.
The red line follows the playing fragment; with Fragments off, click its note preview to play from that point.
Over a loop, the loop repeats while a longer fragment plays in full. A new selection or
seek joins at the next bar; unusually long combined cycles are reported instead of rendered.
The library analysis starts only when **Analyse** is pressed, not when access is
granted, restored, or a folder is listed. Pause remains available. Opening an individual
file can analyse that file on demand. Without direct access, reconnect it or use the
optional helper before starting analysis.

## What was measured in LUNA 3.1.1 on Windows

- `fetch(file://…)` of library files works from the add-on page.
- `luna.gui.listFiles` only lists folders chosen through LUNA's dialog (others answer
  `uasrv.not_permitted`), and returns non-ASCII folder names with `?`, which then fail.
- `setPlugin({ presetUid })` does not apply the preset: SFLT loads without its bank.
