// service-worker.js - Cache Nuker Edition
// This service worker deletes all caches on installation

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing and nuking all caches...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Service Worker: Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('Service Worker: All caches nuked! ☢️');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated and taking control...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Service Worker: Cleaning up cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('Service Worker: Cache cleanup complete!');
            return self.clients.claim(); // Take control of all pages immediately
        })
    );
});

// Don't cache anything - pass all requests through to the network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch((error) => {
            console.error('Service Worker: Fetch failed:', error);
            throw error;
        })
    );
});

// Optional: Listen for messages to manually trigger cache clearing
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NUKE_CACHE') {
        console.log('Service Worker: Manual cache nuke requested!');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('Service Worker: Manual cache nuke complete! 💥');
                // Send message back to the page
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});