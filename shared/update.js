// Updates for the apps on hodzic.github.io, with shared/sw-core.js: a new version downloads in the background and waits until the
// app switches to it (its Update available prompt), then the page reloads. The app checks again whenever it comes back to the front.
// Each app keeps its own copy in its offline cache, refreshed in the background: keep these exports working as they are.
let reg = null, waiting = null, ready = () => {};
const offer = w => { waiting = w; ready(w); };

export const registration = () => reg;
export const updateWaiting = () => !!waiting;
// Switch to the waiting version; the page reloads when it takes over. False when none is waiting.
export function applyUpdate(){ waiting?.postMessage({ type: 'SKIP_WAITING' }); return !!waiting; }

// Check now: 'ready' (offered), 'downloading' (offered once downloaded), 'current', 'failed' (offline?) or 'none' (no service worker).
export async function checkForUpdate(){
  if (waiting) return 'ready';
  if (!reg) return 'none';
  try{ await reg.update(); }catch{ return 'failed'; }
  const w = reg.installing || reg.waiting;
  if (!w) return 'current';
  if (w.state === 'installed'){ offer(w); return 'ready'; }
  return 'downloading';
}

// Register the app's service worker (a path from the page, e.g. 'sw.js'); onReady(worker) is called when a new version waits.
// Resolves to the registration, or null without service workers.
export async function registerUpdates(sw, onReady = () => {}){
  ready = onReady;
  if (!('serviceWorker' in navigator)) return null;
  const sws = navigator.serviceWorker;
  // The first install also takes control; only an update replacing a running version reloads.
  // Checked at each change, not at page load, so a page opened before the first install updates too.
  let ctl = sws.controller, reloading = false;
  sws.addEventListener('controllerchange', () => { const had = ctl; ctl = sws.controller; if (had && !reloading){ reloading = true; location.reload(); } });
  // updateViaCache 'none': the browser checks sw-core.js itself too, not a copy it may keep for 10 minutes (GitHub Pages)
  try{ reg = await sws.register(new URL(sw, document.baseURI), { updateViaCache: 'none' }); }catch{ return null; }
  if (reg.waiting && sws.controller) offer(reg.waiting);
  reg.addEventListener('updatefound', () => { const w = reg.installing;
    w?.addEventListener('statechange', () => { if (w.state === 'installed' && sws.controller) offer(w); }); });
  // an installed app can stay open for days: look again on coming back, and offer one still waiting
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return;
    if (reg.waiting && sws.controller) offer(reg.waiting); else reg.update().catch(() => {}); });
  return reg;
}
