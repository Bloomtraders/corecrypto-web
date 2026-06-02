/* Core Crypto service worker — app-shell offline cache, live data always from network */
const CACHE = 'corecrypto-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache live market / API / chart traffic — always go to network.
  const liveHosts = ['binance.com', 'binance.vision', 'tradingview.com', 'cryptocompare.com',
                     'coingecko.com', 'alternative.me', 'fiscaldata.treasury.gov'];
  if (e.request.method !== 'GET' || liveHosts.some(h => url.hostname.includes(h))) {
    return; // let the browser handle it normally
  }

  // App shell + static assets: cache-first, fall back to network, then offline shell.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
