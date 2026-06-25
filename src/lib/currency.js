// Currency conversion with an offline-first rate cache. Source: open.er-api.com
// (free, no key). We fetch ONE USD-based table and convert any pair through USD
// (amount * rates[to] / rates[from]) so a single cached table covers everything.

const DB_NAME = 'tripvault-currency'
const STORE = 'rates'
const VERSION = 1
const RECORD_ID = 'USD'
const RATES_URL = 'https://open.er-api.com/v6/latest/USD'

// Baseline list for the selectors before any table is cached (incl. the South
// Pacific currencies this trip needs: FJD Fiji, VUV Vanuatu, XPF New Caledonia).
export const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'JPY', 'CHF', 'CNY', 'INR',
  'SGD', 'HKD', 'THB', 'MXN', 'FJD', 'VUV', 'XPF',
]

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
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

// Returns { rates, fetchedAt, providerTime } | undefined.
export async function getCachedRates() {
  const store = await tx('readonly')
  return wrap(store.get(RECORD_ID))
}

export async function refreshRates() {
  const r = await fetch(RATES_URL)
  const j = await r.json()
  if (j.result !== 'success' || !j.rates) throw new Error('Could not fetch exchange rates')
  const payload = {
    id: RECORD_ID,
    rates: j.rates,
    fetchedAt: Date.now(),
    providerTime: (j.time_last_update_unix || 0) * 1000,
  }
  const store = await tx('readwrite')
  await wrap(store.put(payload))
  return payload
}

// amount in `from` → value in `to`, using a USD-based rate table. null if a code
// is missing from the table.
export function convert(amount, from, to, rates) {
  if (rates == null || amount == null || amount === '') return null
  if (from === to) return Number(amount)
  const f = rates[from]
  const t = rates[to]
  if (f == null || t == null) return null
  return (Number(amount) * t) / f
}

// Union of the common list and whatever the cached table knows, sorted.
export function currencyList(rates) {
  const set = new Set(COMMON_CURRENCIES)
  if (rates) Object.keys(rates).forEach((c) => set.add(c))
  return [...set].sort()
}
