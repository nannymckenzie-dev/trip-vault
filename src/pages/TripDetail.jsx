import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateRange, getTripStatus } from '../lib/trips'
import Spinner from '../components/Spinner'

// Phase 1 placeholder: shows trip header + meta, and provides edit/delete.
// The collapsible section panels (flights, hotels, …) land in Phase 2.
const PHASE_2_SECTIONS = [
  'Flights',
  'Hotels',
  'Activities',
  'Restaurants',
  'Ground Transport',
  'Tickets',
  'Documents',
  'Budget',
  'Notes',
]

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(fetchError.message)
        else setTrip(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  async function handleDelete() {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return
    setDeleting(true)
    const { error: delError } = await supabase.from('trips').delete().eq('id', id)
    if (delError) {
      setDeleting(false)
      setError(delError.message)
      return
    }
    navigate('/trips', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-300">
          {error || 'Trip not found.'}
        </p>
        <Link to="/trips" className="font-medium text-sky-600 dark:text-sky-400">
          ← Back to trips
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/trips"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Back to trips"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              {trip.name}
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {formatDateRange(trip.start_date, trip.end_date)} · {getTripStatus(trip)}
            </p>
          </div>
          <Link
            to={`/trips/${id}/edit`}
            className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
          >
            Edit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {trip.cover_photo_url && (
          <img
            src={trip.cover_photo_url}
            alt=""
            className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}

        {trip.destination && (
          <p className="text-slate-700 dark:text-slate-300">{trip.destination}</p>
        )}
        {trip.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">
            {trip.notes}
          </p>
        )}

        <div className="mt-6 space-y-2">
          {PHASE_2_SECTIONS.map((section) => (
            <div
              key={section}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800"
            >
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {section}
              </span>
              <span className="text-xs uppercase tracking-wide">Coming soon</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-8 min-h-[44px] rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {deleting ? 'Deleting…' : 'Delete trip'}
        </button>
      </main>
    </div>
  )
}
