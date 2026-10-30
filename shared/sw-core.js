// Offline and updates for the apps on hodzic.github.io (Outback, MuLoo, Stiko, Panorama Splitter), shared by their service workers.
// An app's sw.js sets its options and calls appWorker() (see README.md). Browsers compare this file when they check an app
// for updates, so a change here reaches every app as an update: keep it working with the options the apps already pass.
self.appWorker = function appWorker({
  cache,                 // this version's cache, e.g. 'stiko-2026-10-30a'; `npm run bump` in the app changes it
  own,                   // key => true for this app's own caches of any version: the old ones are deleted. Apps share this origin's storage.
  shell,                 // the app's files, stored on install
  extra = [],            // also stored on install, when they load (e.g. a CDN library)
  hosts = [],            // other hosts whose files are kept for offline use (CDN, fonts)
  index,                 // the page to open offline
  legacy = () => false,  // key => true for a version from before the update prompt: an update over one takes over by itself
  route,                 // (event, url) => true when the app answers the request itself (share target, map tiles)
  skip = () => false,    // url => true: leave the request to the browser (e.g. test pages)
  activate,              // async (): more cleanup when this version takes over
}){
  const SHARED = ['/shared/update.js'];
  const scope = new URL(self.registration.scope).pathname;
  const isLocal = url => url.origin === location.origin && (url.pathname.startsWith(scope) || url.pathname.startsWith('/shared/'));
  // GitHub Pages lets browsers keep files for 10 minutes: revalidate, or the previous version's files could fill this version's cache
  const fresh = req => req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(new Request(req, { cache: 'no-cache' }));

  // A new version installs and waits until the page asks it to take over (Update available), then the page reloads.
  self.addEventListener('install', e => e.waitUntil((async () => {
    const c = await caches.open(cache);
    await c.addAll([...shell, ...SHARED].map(u => new Request(u, { cache: 'reload' })));
    await Promise.all(extra.map(u => c.add(u).catch(() => {})));
    if ((await caches.keys()).some(k => k !== cache && own(k) && legacy(k))) self.skipWaiting();
  })()));
  self.addEventListener('message', e => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
  self.addEventListener('activate', e => e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== cache && own(k)) await caches.delete(k);
    try{ await activate?.(); }catch{}
    await self.clients.claim();
  })()));

  // The app's files: from the cache, refreshed in the background for next time; from the network when not stored yet.
  self.addEventListener('fetch', e => {
    const req = e.request, url = new URL(req.url);
    if (route?.(e, url)) return;
    if (req.method !== 'GET' || skip(url)) return;
    const local = isLocal(url);
    if (!local && !hosts.includes(url.hostname)) return;
    e.respondWith((async () => {
      const c = await caches.open(cache);
      const hit = await c.match(req, { ignoreSearch: local });
      const net = (local ? fresh(req) : fetch(req)).then(r => {
        if (r.status === 200 || r.type === 'opaque') c.put(req, r.clone()).catch(() => {});
        return r;
      });
      if (hit){ e.waitUntil(net.catch(() => {})); return hit; }
      try{ return await net; }catch(err){
        if (req.mode === 'navigate' && index){ const page = await c.match(index); if (page) return page; }
        return Response.error();
      }
    })());
  });
};
