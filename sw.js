const GHPATH     = "/HTPoC";
const APP_PREFIX = "HTPoC_";
const VERSION    = "version_001";
const CACHE_NAME = APP_PREFIX + VERSION;

const URLS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/styles.css`,
  `${GHPATH}/script.js`,
  `${GHPATH}/lib/StdScript.js`,
  `${GHPATH}/lib/jsQR.js`,
  `${GHPATH}/img/icon-192x192.png`,
  `${GHPATH}/img/icon-256x256.png`,
  `${GHPATH}/img/icon-384x384.png`,
  `${GHPATH}/img/icon-512x512.png`
];

self.addEventListener("fetch", function(e)
{
    console.log("Fetch request: " + e.request.url);

    e.respondWith(
        caches.match(e.request)
        .then(function (request)
        {
            if (request) { 
                console.log("Responding with cache: " + e.request.url);
                return request;
            } else {
                console.log("File is not cached, fetching: " + e.request.url);
                return fetch(e.request);
            }
        });
    );
});

self.addEventListener("install", function(e)
{
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache)
        {
            console.log("Installing cache: " + CACHE_NAME);
            return cache.addAll(URLS);
        });
    );
});

self.addEventListener("activate", function(e)
{
    e.waitUntil(
        caches.keys().then(function (keyList)
        {
            var cacheWhitelist = keyList.filter(function (key)
            {
                return key.indexOf(APP_PREFIX);
            });

            cacheWhitelist.push(CACHE_NAME);

            return Promise.all(keyList.map(function(key, i)
            {
                if (cacheWhitelist.indexOf(key) === -1) {
                    console.log("Deleting cache: " + keyList[i] );
                    return caches.delete(keyList[i]);
                }
            }));
        });
    );
});
