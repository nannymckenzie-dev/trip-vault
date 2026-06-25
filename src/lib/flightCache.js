// 15-minute IndexedDB cache for live flight status. The PRD: results are cached
// 15 min and never auto-refresh — the user taps "Check Status". When offline we
// still surface the last fetched entry (any age) with its timestamp.

const DB_NAME = 'tripvault-flightstatus'
const STORE = 'status'
const VERSION = 1
export const FRESH_MS = 15 * 60 * 1000

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE))
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function statusKey(flightNumber, date) {
  const ident = String(flightNumber || '').toUpperCase().replace(/\s+/g, '')
  return `${ident}|${date ? String(date).slice(0, 10) : ''}`
}

// Returns { key, payload, fetchedAt } | undefined. payload is the /api response.
export async function getCachedStatus(key) {
  const store = await tx('readonly')
  return wrap(store.get(key))
}

export async function cacheStatus(key, payload) {
  const store = await tx('readwrite')
  return wrap(store.put({ key, payload, fetchedAt: Date.now() }))
}

export function isFresh(entry) {
  return Boolean(entry) && Date.now() - entry.fetchedAt < FRESH_MS
}
