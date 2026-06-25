import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCachedRates, refreshRates, convert, currencyList } from '../lib/currency'
import { getHomeCurrency } from '../lib/prefs'
import { formatMoney } from '../lib/datetime'

const PAIRS_KEY = 'tripvault.currencyPairs'
const STALE_MS = 6 * 60 * 60 * 1000

function loadPairs() {
  try {
    return JSON.parse(localStorage.getItem(PAIRS_KEY) || '[]')
  } catch {
    return []
  }
}

function savePair(from, to) {
  if (from === to) return loadPairs()
  const key = `${from}>${to}`
  const next = [key, ...loadPairs().filter((p) => p !== key)].slice(0, 6)
  localStorage.setItem(PAIRS_KEY, JSON.stringify(next))
  return next
}

// Most-common currency used across the trip's cost fields + budget entries.
async function tripCurrency(tripId) {
  const tables = [
    ['hotels', 'currency'],
    ['activities', 'currency'],
    ['ground_transport', 'currency'],
    ['budget_entries', 'currency'],
  ]
  const results = await Promise.all(
    tables.map(([t, col]) => supabase.from(t).select(col).eq('trip_id', tripId))
  )
  const counts = {}
  for (const { data } of results) {
    for (const row of data || []) {
      const c = row.currency
      if (c) counts[c] = (counts[c] || 0) + 1
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  return top || null
}

export default function Currency() {
  const { id } = useParams()
  const [rates, setRates] = useState(null) // { rates, fetchedAt }
  const [amount, setAmount] = useState('1')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState(() => getHomeCurrency())
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [pairs, setPairs] = useState(loadPairs())

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const [cached, common] = await Promise.all([getCachedRates(), tripCurrency(id)])
      if (!active) return
      if (cached) setRates(cached)
      if (common && common !== getHomeCurrency()) setFrom(common)
      // Refresh once per visit if online and the table is missing or stale.
      if (navigator.onLine && (!cached || Date.now() - cached.fetchedAt > STALE_MS)) {
        try {
          const fresh = await refreshRates()
          if (active) setRates(fresh)
        } catch {
          /* keep cached */
        }
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const list = currencyList(rates?.rates)
  const result = convert(Number(amount) || 0, from, to, rates?.rates)

  function changeFrom(v) {
    setFrom(v)
    setPairs(savePair(v, to))
  }
  function changeTo(v) {
    setTo(v)
    setPairs(savePair(from, v))
  }
  function swap() {
    setFrom(to)
    setTo(from)
    setPairs(savePair(to, from))
  }
  function applyPair(p) {
    const [f, t] = p.split('>')
    setFrom(f)
    setTo(t)
  }

  async function refresh() {
    if (!navigator.onLine) {
      setError('No internet connection')
      return
    }
    setRefreshing(true)
    setError(null)
    try {
      setRates(await refreshRates())
    } catch (e) {
      setError(e.message || 'Could not refresh rates')
    } finally {
      setRefreshing(false)
    }
  }

  const selectCls =
    'min-h-[44px] rounded-lg border border-line bg-surface px-3 text-base text-text outline-none focus:border-accent'

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={`/trips/${id}`}
            aria-label="Back to trip"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-text-dim hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-text">Currency</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {!rates && !online ? (
          <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
            <p className="text-text-soft">
              No exchange rates saved yet. Connect to the internet and tap Refresh once — after
              that the converter works offline.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <label className="block text-xs font-medium uppercase tracking-wide text-text-dim">
              Amount
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-2xl font-semibold text-text outline-none focus:border-accent"
            />

            <div className="mt-4 flex items-end gap-2">
              <label className="flex-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-dim">From</span>
                <select value={from} onChange={(e) => changeFrom(e.target.value)} className={`mt-1 w-full ${selectCls}`}>
                  {list.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={swap}
                aria-label="Swap currencies"
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-dim ring-1 ring-line hover:bg-bg"
              >
                ⇄
              </button>
              <label className="flex-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-text-dim">To</span>
                <select value={to} onChange={(e) => changeTo(e.target.value)} className={`mt-1 w-full ${selectCls}`}>
                  {list.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-bg p-4 text-center">
              {result == null ? (
                <p className="text-sm text-text-dim">
                  Rate unavailable for this pair — try Refresh.
                </p>
              ) : (
                <p className="text-3xl font-bold text-text">
                  {formatMoney(result, to)}
                </p>
              )}
              {result != null && from !== to && (
                <p className="mt-1 text-xs text-text-dim">
                  1 {from} = {formatMoney(convert(1, from, to, rates?.rates), to)}
                </p>
              )}
            </div>

            {pairs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {pairs.map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPair(p)}
                    className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text-soft hover:bg-surface-2"
                  >
                    {p.replace('>', ' → ')}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-text-dim">
                {rates
                  ? `Rates as of ${new Date(rates.fetchedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                  : 'No rates yet'}
              </p>
              <button
                onClick={refresh}
                disabled={refreshing || !online}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-accent-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? 'Refreshing…' : 'Refresh rates'}
              </button>
            </div>
            {!online && (
              <p className="mt-1 text-xs text-text-dim">Offline — using saved rates.</p>
            )}
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
