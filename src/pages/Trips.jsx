import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sortTrips, getTripStatus, TRIP_STATUS } from '../lib/trips'
import TripCard from '../components/TripCard'
import Wordmark from '../components/Wordmark'
import DoubleArrow from '../components/Arrow'
import Spinner from '../components/Spinner'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

export default function Trips() {
  const { user, signOut } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: fetchError } = await supabase.from('trips').select('*')
      if (!active) return
      if (fetchError) setError(fetchError.message)
      else setTrips(sortTrips(data ?? []))
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    if (filter === 'all') return trips
    return trips.filter((t) => {
      const s = getTripStatus(t)
      if (filter === 'past') return s === TRIP_STATUS.PAST
      return s !== TRIP_STATUS.PAST // upcoming + in-progress
    })
  }, [trips, filter])

  return (
    <div className="relative min-h-full bg-bg">
      <div className="brand-grain" />
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Wordmark size={23} />
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-text-dim hover:text-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <button
              onClick={() => signOut()}
              title={user?.email}
              className="min-h-[44px] rounded-xl px-3 text-sm font-medium text-text-dim hover:text-text"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/trips/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-base font-bold text-on-accent shadow-[0_3px_10px_rgba(138,90,51,.25)] transition hover:brightness-95 active:scale-[.98]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Trip
          </Link>
          {trips.length > 0 && (
            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`min-h-[40px] rounded-full px-3 text-[11px] label-caps transition ${
                    filter === f.key
                      ? 'bg-text text-bg'
                      : 'border border-line text-text-soft hover:bg-surface'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <p className="rounded-card border border-line bg-surface px-4 py-3 text-sm text-accent-strong">
            Couldn’t load trips: {error}
          </p>
        ) : trips.length === 0 ? (
          <div className="mx-auto mt-6 max-w-sm rounded-card bg-surface p-8 text-center shadow-[0_6px_18px_rgba(42,39,36,.10)] ring-1 ring-line">
            <DoubleArrow width={56} className="mx-auto text-text-dim" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-text">
              Nothing booked. How responsible.
            </h2>
            <p className="mt-2 text-sm text-text-soft">
              Start a trip and we’ll keep the confirmation numbers you’ll inevitably lose.
            </p>
            <Link
              to="/trips/new"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-5 py-3 text-base font-bold text-on-accent shadow-[0_3px_10px_rgba(138,90,51,.25)] hover:brightness-95 active:scale-[.98]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Trip
            </Link>
            <p className="mt-5 label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.28em' }}>
              Established 2003
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-dim">No {filter} trips.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {visible.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
