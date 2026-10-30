# hodzic.github.io

Hub page for my small web apps: [Stiko](https://hodzic.github.io/stiko/), [Outback](https://hodzic.github.io/outback/), [Panorama Splitter](https://hodzic.github.io/photo-splitter/) and [MuLoo](https://hodzic.github.io/muloo/). Served by GitHub Pages at https://hodzic.github.io/.

`index.html` is the whole page; `shots/` holds the phone screenshots (390 × 844 at 2×). The app icons load from each app's own path.

Image links carry `?v=<first 8 hex of the file's md5>` so browsers fetch a replaced screenshot instead of a cached one
(GitHub Pages lets browsers cache files for 10 minutes). Update the tag when you replace an image.

## Shared offline and update code

`shared/` holds what every app's offline support has in common, served at `https://hodzic.github.io/shared/`:

- `sw-core.js` – the service worker: stores the app's files on install (fresh, not the browser's HTTP-cached copies), serves
  them from the cache and refreshes them in the background, opens the stored page offline, deletes only the app's own old caches,
  and waits for the page to say when to switch to a new version. An app's `sw.js` is just its options:

  ```js
  importScripts('/shared/sw-core.js');
  appWorker({
    cache: 'stiko-2026-10-30a',                // npm run bump
    own: k => k.startsWith('stiko-'),          // this app's caches (other apps share the origin's storage)
    shell: ['/stiko/', '/stiko/index.html'],   // stored on install
    index: '/stiko/index.html',                // opened offline
    hosts: ['fonts.gstatic.com'],              // other hosts kept for offline use
  });
  ```

  Also `extra` (stored if they load), `legacy` (old versions without the update prompt), `route` (requests the app answers
  itself), `skip` (left to the browser) and `activate` (more cleanup). See the comments in the file.
- `update.js` – the page side: `registerUpdates('sw.js', onReady)`, `checkForUpdate()`, `applyUpdate()`, `updateWaiting()`,
  `registration()`. The app shows its own prompt and wording. Every app stores `update.js` with its files.

A change here reaches every app: browsers compare `sw-core.js` when they check an app for updates, so each app offers an
update. Keep both files working with what the apps already pass and call. To try an app locally, serve a folder that has the
app and `shared` side by side (as on the site), e.g. `ln -s ../hodzic.github.io/shared shared` next to the app checkout.
