// A steady tick for scheduling audio, that goes on when the Add On's window is out of sight.
// A page's own timers are slowed to about once a second there (the browser saves power on
// pages not in view), too slow for a player that schedules a fraction of a second ahead: it
// falls silent, and a loop following LUNA loses it. A Worker's timer is not slowed so: one
// ticks for everything here, its messages calling each listener. Where a Worker cannot be made,
// a page timer instead (it works while the window is in sight).

const TICK_MS = 25;
const listeners = new Set();
let worker;     // undefined: not tried yet; null: not available
let timer = 0;  // the page timer, when there is no Worker

function ensure() {
  if (worker !== undefined) return;
  try {
    const src = 'let t = 0; onmessage = (e) => { clearInterval(t); if (e.data > 0) t = setInterval(() => postMessage(0), e.data); };';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = fire;
  } catch {
    worker = null;
  }
}

function fire() {
  for (const fn of listeners) {
    try { fn(); } catch (e) { console.error(e); }
  }
}

function run(on) {
  if (worker) worker.postMessage(on ? TICK_MS : 0);
  else if (on && !timer) timer = setInterval(fire, TICK_MS);
  else if (!on && timer) { clearInterval(timer); timer = 0; }
}

/** Call `fn` every 25 ms or so, in sight or not. Returns what stops it. */
export function every(fn) {
  ensure();
  listeners.add(fn);
  if (listeners.size === 1) run(true);
  return () => {
    if (!listeners.delete(fn)) return;
    if (!listeners.size) run(false);
  };
}

/** Whether the ticks come from a Worker (they go on out of sight), for the log. */
export const tickerInBackground = () => (ensure(), !!worker);
