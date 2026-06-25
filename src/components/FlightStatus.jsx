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
  red: 'bg-red-500/10 text-red-600',
  amber: 'bg-accent/20 text-accent-strong',
  emerald: 'bg-sage/20 text-sage',
  slate: 'bg-line/40 text-text-dim',
}

function Leg({ label, place, scheduled, actual, estimated, delay }) {
  const live = actual || estimated
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <p className="label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>{label}</p>
        <p className="font-display text-base font-bold text-text">{place?.code || '—'}</p>
        {(place?.terminal || place?.gate) && (
          <p className="text-xs text-text-dim">
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
                ? 'text-xs text-text-dim line-through'
                : 'text-sm font-medium text-text'
            }
          >
            {formatDateTime(scheduled)}
          </p>
        )}
        {live && live !== scheduled && (
          <p className="text-sm font-semibold text-text">{formatDateTime(live)}</p>
        )}
        {delayLabel(delay) && (
          <p
            className={
              (delay ?? 0) > 0
                ? 'text-xs font-medium text-accent-strong'
                : 'text-xs text-sage'
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
    <div
      className="mt-4 rounded-card p-4 ring-1 ring-sage/40"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-sage) 13%, transparent)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.16em' }}>
          Flight status
        </p>
        <button
          onClick={check}
          disabled={loading || !online}
          className="min-h-[40px] rounded-lg border border-sage px-3 text-sm font-semibold text-sage transition hover:bg-sage/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Checking…' : flight ? 'Refresh' : 'Check Status'}
        </button>
      </div>

      {!online && (
        <p className="mt-2 text-xs text-text-dim">
          No internet connection — showing last fetched status.
        </p>
      )}
      {error && online && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {info && <p className="mt-2 text-sm text-text-dim">{info}</p>}

      {flight ? (
        <div className="mt-3">
          {flight.status && (
            <span className={`inline-block rounded-pill px-3 py-1 text-xs font-bold ${badge}`}>
              {flight.cancelled ? 'Cancelled' : flight.status}
            </span>
          )}
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
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
            <p className="mt-2 text-xs text-text-dim">
              As of {new Date(fetchedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              {stale && ' · tap Refresh for the latest'}
            </p>
          )}
        </div>
      ) : (
        !error &&
        !info && (
          <p className="mt-2 text-sm text-text-dim">
            Tap “Check Status” for live departure and arrival times.
          </p>
        )
      )}
    </div>
  )
}
