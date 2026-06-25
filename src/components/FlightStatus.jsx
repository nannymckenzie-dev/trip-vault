import { useCallback, useEffect, useState } from 'react'
import { fetchFlightStatus } from '../lib/api'
import { statusKey, getCachedStatus, cacheStatus, isFresh } from '../lib/flightCache'
import { formatDateTime } from '../lib/datetime'

function delayLabel(seconds) {
  if (seconds == null) return null
  const mins = Math.round(seconds / 60)
  if (mins === 0) return 'On time'
  if (mins > 0) return `${mins} min late`
  return `${-mins} min early`
}

// Colour the badge from the AeroAPI status string + cancel/delay signals.
function tone(flight) {
  if (!flight) return 'slate'
  if (flight.cancelled) return 'red'
  const s = (flight.status || '').toLowerCase()
  if (s.includes('cancel')) return 'red'
  if (s.includes('delay') || (flight.departure_delay ?? 0) > 600 || (flight.arrival_delay ?? 0) > 600)
    return 'amber'
  if (s.includes('on time') || s.includes('arrived') || s.includes('landed')) return 'emerald'
  return 'slate'
}

const TONES = {
  red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function Leg({ label, place, scheduled, actual, estimated, delay }) {
  const live = actual || estimated
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {place?.code || '—'}
        </p>
        {(place?.terminal || place?.gate) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[place.terminal && `Term ${place.terminal}`, place.gate && `Gate ${place.gate}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <div className="text-right">
        {scheduled && (
          <p
            className={
              live && live !== scheduled
                ? 'text-xs text-slate-400 line-through'
                : 'text-sm font-medium text-slate-900 dark:text-slate-100'
            }
          >
            {formatDateTime(scheduled)}
          </p>
        )}
        {live && live !== scheduled && (
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatDateTime(live)}
          </p>
        )}
        {delayLabel(delay) && (
          <p
            className={
              (delay ?? 0) > 0
                ? 'text-xs font-medium text-amber-600 dark:text-amber-400'
                : 'text-xs text-emerald-600 dark:text-emerald-400'
            }
          >
            {delayLabel(delay)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function FlightStatus({ flightNumber, date }) {
  const key = statusKey(flightNumber, date)

  const [flight, setFlight] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  // Show the last cached result on mount — without hitting the network.
  useEffect(() => {
    let active = true
    getCachedStatus(key).then((entry) => {
      if (active && entry) {
        setFlight(entry.payload.flight)
        setFetchedAt(entry.fetchedAt)
      }
    })
    return () => {
      active = false
    }
  }, [key])

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

  const check = useCallback(async () => {
    setError(null)
    setInfo(null)
    if (!navigator.onLine) {
      setError('No internet connection')
      return
    }
    // Reuse a fresh (<15 min) cache rather than spending an AeroAPI query.
    const cached = await getCachedStatus(key)
    if (isFresh(cached)) {
      setFlight(cached.payload.flight)
      setFetchedAt(cached.fetchedAt)
      return
    }
    setLoading(true)
    try {
      const payload = await fetchFlightStatus(flightNumber, date)
      // Trip too far out (or out of AeroAPI's window) — informational, not an error.
      if (payload.unavailable) {
        setInfo(payload.message)
        return
      }
      await cacheStatus(key, payload)
      setFlight(payload.flight)
      setFetchedAt(Date.now())
    } catch (err) {
      setError(err.message || 'Could not fetch flight status')
    } finally {
      setLoading(false)
    }
  }, [key, flightNumber, date])

  const stale = fetchedAt != null && Date.now() - fetchedAt >= 15 * 60 * 1000
  const badge = TONES[tone(flight)]

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Live status</p>
        <button
          onClick={check}
          disabled={loading || !online}
          className="min-h-[40px] rounded-lg bg-sky-600 px-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Checking…' : flight ? 'Refresh' : 'Check Status'}
        </button>
      </div>

      {!online && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          No internet connection — showing last fetched status.
        </p>
      )}
      {error && online && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {info && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{info}</p>}

      {flight ? (
        <div className="mt-3">
          {flight.status && (
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
              {flight.cancelled ? 'Cancelled' : flight.status}
            </span>
          )}
          <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-800">
            <Leg
              label="Departure"
              place={flight.origin}
              scheduled={flight.scheduled_out}
              actual={flight.actual_out}
              estimated={flight.estimated_out}
              delay={flight.departure_delay}
            />
            <Leg
              label="Arrival"
              place={flight.destination}
              scheduled={flight.scheduled_in}
              actual={flight.actual_in}
              estimated={flight.estimated_in}
              delay={flight.arrival_delay}
            />
          </div>
          {fetchedAt && (
            <p className="mt-2 text-xs text-slate-400">
              As of {new Date(fetchedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {stale && ' · tap Refresh for the latest'}
            </p>
          )}
        </div>
      ) : (
        !error &&
        !info && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tap “Check Status” for live departure and arrival times.
          </p>
        )
      )}
    </div>
  )
}
