// Background indexing: read every file of the scan index that the store does not hold yet and
// analyse it in a Web Worker. It can be paused and resumed (also across sessions: finished files
// are saved in batches).

import { NoAccess } from './reader.js';
import AnalysisWorker from './analysis-worker.js?worker&inline';

const SLICE_MS = 14;     // work at most this long before letting the page breathe
const BATCH = 250;       // records per store write
const ANALYSIS_WORKERS = 1;
const WORKER_FILE_LIMIT = 100;

function abortError() {
  return Object.assign(new Error('Analysis cancelled.'), { name: 'AbortError' });
}

function workerError(message) {
  return Object.assign(new Error(message), { name: 'WorkerFailure' });
}

export class Indexer {
  /** `isBusy()`: while it answers true (listening, sending to LUNA) the work waits. */
  constructor({ store, catalog, reader, onProgress = () => {}, onStop = () => {}, onFileStart = () => {}, onWarning = () => {}, isBusy = () => false, workerFactory = () => new AnalysisWorker() }) {
    Object.assign(this, { store, catalog, reader, onProgress, onStop, onFileStart, onWarning, isBusy, workerFactory });
    this.running = false;
    this.total = 0;
    this.done = 0;
    this.pending = [];
    this.started = 0;
    this.elapsedBefore = 0;
    this.initialDone = null;
    this.epoch = 0;
    this.runId = 0;
    this.analysisWorkers = [];
    this.analysisWorkerCounts = new Map();
    this.analysisRequests = new Map();
    this.analysisRequestId = 0;
  }

  getAnalysisWorker() {
    const activeCount = (worker) => [...this.analysisRequests.values()].filter((request) => request.worker === worker).length;
    const available = this.analysisWorkers.find((worker) => activeCount(worker) === 0);
    if (available) return available;
    if (this.analysisWorkers.length >= ANALYSIS_WORKERS) {
      return this.analysisWorkers.reduce((leastBusy, worker) => activeCount(worker) < activeCount(leastBusy) ? worker : leastBusy);
    }
    let worker;
    try {
      worker = this.workerFactory();
    } catch (error) {
      throw workerError(`Could not start the MIDI analysis worker: ${error.message || error}`);
    }
    this.analysisWorkers.push(worker);
    this.analysisWorkerCounts.set(worker, 0);
    worker.onmessage = ({ data }) => {
      if (!this.analysisWorkers.includes(worker)) return;
      const request = this.analysisRequests.get(data.id);
      if (!request) return;
      if (data.phase === 'start') {
        this.currentPath = data.path;
        this.onFileStart(data.path);
      } else {
        this.analysisRequests.delete(data.id);
        this.analysisWorkerCounts.set(worker, this.analysisWorkerCounts.get(worker) + 1);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.record);
        const stillWorking = [...this.analysisRequests.values()].some((pending) => pending.worker === worker);
        if (!stillWorking && this.analysisWorkerCounts.get(worker) >= WORKER_FILE_LIMIT) this.retireAnalysisWorker(worker);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      const location = event.filename ? ` (${event.filename}${event.lineno ? `:${event.lineno}` : ''})` : '';
      const message = event.message || event.error?.message || 'The worker script could not be loaded or executed.';
      this.failAnalysisWorker(worker, workerError(`The MIDI analysis worker failed${location}: ${message}`));
    };
    return worker;
  }

  retireAnalysisWorker(worker) {
    if (!this.analysisWorkers.includes(worker)) return;
    this.analysisWorkers = this.analysisWorkers.filter((candidate) => candidate !== worker);
    this.analysisWorkerCounts.delete(worker);
    worker.terminate();
  }

  failAnalysisWorker(worker, error) {
    if (!this.analysisWorkers.includes(worker)) return;
    this.analysisWorkers = this.analysisWorkers.filter((candidate) => candidate !== worker);
    this.analysisWorkerCounts.delete(worker);
    worker.terminate();
    for (const [id, request] of this.analysisRequests) {
      if (request.worker !== worker) continue;
      this.analysisRequests.delete(id);
      request.reject(error);
    }
  }

  analyse(path, bytes, { includeSearchScores = false, compact = false } = {}) {
    return new Promise((resolve, reject) => {
      let worker;
      try {
        worker = this.getAnalysisWorker();
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const input = view.byteOffset === 0 && view.byteLength === view.buffer.byteLength ? view : view.slice();
        const id = ++this.analysisRequestId;
        this.analysisRequests.set(id, { resolve, reject, worker });
        worker.postMessage({ id, path, bytes: input, includeSearchScores, compact }, [input.buffer]);
      } catch (error) {
        const failure = workerError(`Could not send MIDI data to the analysis worker: ${error.message || error}`);
        if (worker) this.failAnalysisWorker(worker, failure);
        reject(failure);
      }
    });
  }

  cancelAnalysis() {
    for (const worker of [...this.analysisWorkers]) this.failAnalysisWorker(worker, abortError());
  }

  needsAnalysis(path) {
    const file = this.catalog.file(path);
    return !this.catalog.current(path) || (file.ok && file.searchScores === false);
  }

  /** Analyse new files and add missing Search scores. Resolves when finished or paused. */
  async start(paths) {
    if (this.running) return;
    const runId = ++this.runId;
    const isCurrentRun = () => this.running && runId === this.runId;
    this.running = true;
    const epoch = this.epoch;
    this.total = paths.length;
    const pending = paths.filter((p) => this.needsAnalysis(p));
    this.pending = pending;
    this.done = this.total - this.pending.length;
    this.initialDone ??= this.done;
    this.started = performance.now();
    const batch = [];
    let next = 0;
    let sliceAt = performance.now();
    let reason = 'fin';
    let warnedUnverified = false;
    const flush = async () => {
      const rows = batch.splice(0);
      await this.store.putFiles(rows);
    };
    const worker = async () => {
      while (isCurrentRun() && next < pending.length) {
        // The page's own audio and uploads come first.
        while (isCurrentRun() && this.isBusy()) await new Promise((r) => setTimeout(r, 300));
        if (!isCurrentRun()) break;
        const path = pending[next++];
        if (!this.needsAnalysis(path)) { this.done++; continue; }
        const old = this.catalog.current(path) ? this.catalog.file(path) : null;
        let record;
        try {
          const bytes = await this.reader.read(path);
          if (!isCurrentRun()) return;
          record = await this.analyse(path, bytes, { includeSearchScores: true, compact: true });
        } catch (e) {
          if (!isCurrentRun() || e.name === 'AbortError') return;
          if (e instanceof NoAccess) { reason = e.message; this.running = false; return; }
          if (e.name === 'WorkerFailure') {
            reason = e.message;
            this.running = false;
            this.cancelAnalysis();
            return;
          }
          if (old) {
            this.onWarning({ path, limited: `Search scores could not be updated: ${e.message}` });
            this.done++;
            continue;
          }
          record = { path, ok: false };
        }
        if (epoch !== this.epoch || !isCurrentRun()) return;   // read for a library that has been replaced
        if (old) {
          if ((old.fp && old.fp !== record.fp) || !this.catalog.matchesSearchParts(record)) {
            this.onWarning({ path, limited: 'Search scores were not updated because this MIDI no longer matches its saved analysis.' });
            this.done++;
            continue;
          }
          if (!old.fp && !warnedUnverified) {
            this.onWarning({ path, limited: 'Some saved analyses have no fingerprint: matching part and fragment positions were checked, but unchanged MIDI contents cannot be verified.' });
            warnedUnverified = true;
          }
        }
        this.catalog.addFile(record);
        if (record.limited) this.onWarning(record);
        batch.push(record);
        this.done++;
        if (batch.length >= BATCH) await flush();
        if (performance.now() - sliceAt > SLICE_MS) {
          this.onProgress(this);
          await new Promise((r) => setTimeout(r, 0));
          sliceAt = performance.now();
        }
      }
    };
    await worker();
    if (epoch !== this.epoch) return;   // replaced: a new run may be going already
    await flush();
    this.accountRunTime();
    if (runId !== this.runId) {
      if (!this.running && this.runId === runId + 1) {
        this.onProgress(this);
        this.onStop('pausa', this);
      }
      return;
    }
    if (this.running) this.running = false;
    else if (reason === 'fin') reason = 'pausa';
    this.onProgress(this);
    this.onStop(reason, this);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.accountRunTime();
    this.runId++;
    this.cancelAnalysis();
  }

  accountRunTime() {
    if (!this.started) return;
    this.elapsedBefore += (performance.now() - this.started) / 1000;
    this.started = 0;
  }

  /** Another library: what is being read for this one is dropped, here and in analyseOne. */
  reset() {
    this.pause();
    this.cancelAnalysis();
    this.epoch++;
    this.elapsedBefore = 0;
    this.initialDone = null;
  }

  /** Files per second since start, and an estimate of the time left. */
  get rate() {
    const elapsedSec = this.elapsedBefore + (this.started ? (performance.now() - this.started) / 1000 : 0);
    const n = this.done - (this.initialDone ?? this.done);
    const perSec = elapsedSec > 0 ? n / elapsedSec : 0;
    return { perSec, elapsedSec, leftSec: perSec ? (this.total - this.done) / perSec : Infinity };
  }

  /** Analyse one file now (a row the user looks at) and keep it, as the background run would. */
  async analyseOne(path, bytes) {
    if (this.catalog.current(path)) return this.catalog.file(path);
    const epoch = this.epoch;
    const data = bytes ?? (await this.reader.read(path));
    let record;
    try {
      record = await this.analyse(path, data, { includeSearchScores: true, compact: true });
    } catch (error) {
      if (error.name === 'AbortError' || epoch !== this.epoch) return undefined;
      throw error;
    }
    if (epoch !== this.epoch) return undefined;
    this.catalog.addFile(record);
    await this.store.putFiles([record]);
    return this.catalog.file(path);
  }
}
