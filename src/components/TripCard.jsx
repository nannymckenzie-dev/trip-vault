import { Link } from 'react-router-dom'
import { getTripStatus, formatDateRange, TRIP_STATUS } from '../lib/trips'

const STATUS_STYLES = {
  [TRIP_STATUS.UPCOMING]:
    'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  [TRIP_STATUS.IN_PROGRESS]:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  [TRIP_STATUS.PAST]:
    'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

export default function TripCard({ trip }) {
  const status = getTripStatus(trip)

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
        {trip.cover_photo_url ? (
          <img
            src={trip.cover_photo_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-10 w-10"
            >
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 font-semibold text-slate-900 dark:text-slate-50">
          {trip.name}
        </h3>
        {trip.destination && (
          <p className="line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
            {trip.destination}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
      </div>
    </Link>
  )
}
