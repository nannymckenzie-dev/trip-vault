// Trip status + date helpers shared across the trips screens.

export const TRIP_STATUS = {
  UPCOMING: 'UPCOMING',
  IN_PROGRESS: 'IN PROGRESS',
  PAST: 'PAST',
}

// Compare on calendar date only (ignore time-of-day) using local midnight.
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(value) {
  if (!value) return null
  // `YYYY-MM-DD` from Postgres `date` — parse as local, not UTC.
  const [y, m, d] = value.split('-').map(Number)
  if (!y) return null
  return new Date(y, m - 1, d)
}

export function getTripStatus(trip) {
  const today = startOfToday()
  const start = parseDate(trip.start_date)
  const end = parseDate(trip.end_date)

  if (start && start > today) return TRIP_STATUS.UPCOMING
  if (end && end < today) return TRIP_STATUS.PAST
  if (start && start <= today && (!end || end >= today))
    return TRIP_STATUS.IN_PROGRESS
  // No usable dates: treat as upcoming so it stays visible at the top.
  return TRIP_STATUS.UPCOMING
}

// Sort: upcoming/in-progress first (soonest start first), then past
// newest-to-oldest. Matches the PRD home-screen ordering.
export function sortTrips(trips) {
  const rank = { [TRIP_STATUS.IN_PROGRESS]: 0, [TRIP_STATUS.UPCOMING]: 1, [TRIP_STATUS.PAST]: 2 }
  return [...trips].sort((a, b) => {
    const sa = getTripStatus(a)
    const sb = getTripStatus(b)
    if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb]

    if (sa === TRIP_STATUS.PAST) {
      // Newest-to-oldest by end date (fall back to start).
      return (b.end_date || b.start_date || '').localeCompare(
        a.end_date || a.start_date || ''
      )
    }
    // Upcoming / in-progress: soonest start first.
    return (a.start_date || '').localeCompare(b.start_date || '')
  })
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (start && end) return `${dateFmt.format(start)} – ${dateFmt.format(end)}`
  if (start) return dateFmt.format(start)
  if (end) return dateFmt.format(end)
  return 'Dates TBD'
}
