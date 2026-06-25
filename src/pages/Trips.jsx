import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sortTrips } from '../lib/trips'
import TripCard from '../components/TripCard'
import Spinner from '../components/Spinner'

export default function Trips() {
  const { user, signOut } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
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

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Trips
            </h1>
          </div>
          <button
            onClick={() => signOut()}
            title={user?.email}
            className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Link
          to="/trips/new"
          className="mb-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Trip
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Couldn’t load trips: {error}
          </p>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400">No trips yet.</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Tap “New Trip” to add your first one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
