import { Link } from 'react-router-dom'
import { getTripStatus, formatDateRange } from '../lib/trips'
import StatusPill from './StatusPill'

// Warm cover gradients (placeholders when a trip has no cover photo).
const GRADIENTS = [
  'linear-gradient(135deg,#C79A5B,#9A6B3C,#5E4A3A)',
  'linear-gradient(135deg,#8A5A33,#5E4A3A,#3E2C1E)',
  'linear-gradient(135deg,#6E7A6A,#5E6A56,#3E4A3A)',
  'linear-gradient(135deg,#C79A5B,#8A5A33,#6E7A6A)',
]
function gradientFor(id) {
  let h = 0
  for (const ch of String(id)) h += ch.charCodeAt(0)
  return GRADIENTS[h % GRADIENTS.length]
}

export default function TripCard({ trip }) {
  const status = getTripStatus(trip)

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-card bg-surface shadow-[0_3px_10px_rgba(42,39,36,.05)] ring-1 ring-line transition hover:shadow-[0_6px_18px_rgba(42,39,36,.10)] focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div
        className="relative aspect-[4/3] w-full"
        style={{ background: trip.cover_photo_url ? undefined : gradientFor(trip.id) }}
      >
        {trip.cover_photo_url ? (
          <img src={trip.cover_photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,.16) 0 1px, transparent 1px 11px)',
            }}
          />
        )}
        <StatusPill status={status} className="absolute left-2 top-2" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 font-display font-semibold text-text">{trip.name}</h3>
        {trip.destination && (
          <p className="line-clamp-1 text-sm text-text-soft">{trip.destination}</p>
        )}
        <p className="mt-1 text-xs text-text-dim">
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
      </div>
    </Link>
  )
}
