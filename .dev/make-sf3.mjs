// Development only: the bundled soundfont as SF3 (each sample Ogg Vorbis compressed), so the
// .lunaaddon stays small (UA Universe refused a 29.7 MB package). spessasynth_core reads SF3
// (stb-vorbis decodes it). GeneralUser GS's licence allows changing its packaging.
//
//   node .dev/make-sf3.mjs <in.sf2> <out.sf3> [quality 0-10, default 4]
//
// Needs ffmpeg with libvorbis (FFMPEG env var, or ffmpeg on PATH).

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { SoundBankLoader } from 'spessasynth_core';

const [input, output, q = '4'] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node .dev/make-sf3.mjs <in.sf2> <out.sf3> [quality]');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

function encodeVorbis(audioData, sampleRate) {
  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
      '-c:a', 'libvorbis', '-q:a', String(q), '-f', 'ogg', 'pipe:1']);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (c) => { err += c; });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve(new Uint8Array(Buffer.concat(chunks))) : reject(new Error(`ffmpeg ${code}: ${err}`))));
    ff.stdin.end(Buffer.from(audioData.buffer, audioData.byteOffset, audioData.byteLength));
  });
}

const buf = readFileSync(input);
const bank = SoundBankLoader.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const samples = bank.samples;
let done = 0;
const queue = [...samples];
const workers = Array.from({ length: 6 }, async () => {
  for (let s = queue.shift(); s; s = queue.shift()) {
    if (!s.isCompressed) await s.compressSample(encodeVorbis);
    if (++done % 100 === 0) console.log(`${done}/${samples.length} samples`);
  }
});
await Promise.all(workers);
writeFileSync(output, Buffer.from(bank.writeSF2({ software: 'MIDI Digger make-sf3' })));
console.log(`${samples.length} samples · ${(statSync(input).size / 1e6).toFixed(1)} MB -> ${(statSync(output).size / 1e6).toFixed(1)} MB: ${output}`);
