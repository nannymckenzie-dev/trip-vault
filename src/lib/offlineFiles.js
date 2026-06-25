// Offline file cache backed by IndexedDB. Stores file blobs keyed by their
// storage path so documents/tickets marked "Save offline" are readable with no
// network (PRD offline strategy). Raw IndexedDB — no extra dependency.

const DB_NAME = 'tripvault-files'
const STORE = 'files'
const VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'path' })
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

export async function cacheFile(path, blob, meta = {}) {
  const store = await tx('readwrite')
  return wrap(store.put({ path, blob, type: blob.type, savedAt: Date.now(), ...meta }))
}

export async function getCachedFile(path) {
  const store = await tx('readonly')
  return wrap(store.get(path)) // { path, blob, ... } | undefined
}

export async function isCached(path) {
  const store = await tx('readonly')
  const key = await wrap(store.getKey(path))
  return key !== undefined
}

export async function removeCachedFile(path) {
  const store = await tx('readwrite')
  return wrap(store.delete(path))
}

// Set of all cached paths — lets a list show offline indicators in one read.
export async function cachedPaths() {
  const store = await tx('readonly')
  const keys = await wrap(store.getAllKeys())
  return new Set(keys)
}

// Rough total size of cached blobs, for a settings "cache size" estimate.
export async function cacheSizeBytes() {
  const store = await tx('readonly')
  const all = await wrap(store.getAll())
  return all.reduce((sum, r) => sum + (r.blob?.size || 0), 0)
}
