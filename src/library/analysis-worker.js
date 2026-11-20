import { analyseFile } from '../midi/features.js';
import { fingerprint } from './backup.js';
import { compactSearchScores } from './catalog.js';

self.onmessage = ({ data: { id, path, bytes, includeSearchScores = false, compact = false } }) => {
  try {
    self.postMessage({ id, path, phase: 'start' });
    const record = { ...analyseFile(path, bytes, { includeSearchScores, includePlaybackEvents: !compact }), fp: fingerprint(bytes) };
    if (compact) compactSearchScores(record);
    self.postMessage({ id, record });
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
