import { getUser, failAuth } from '../_lib/supabaseAdmin.js'

// Live flight status via FlightAware AeroAPI v4 (free personal tier, 500/mo).
// Header-authed like the other /api functions; the AEROAPI_KEY never leaves the
// server. The client caches results for 15 min in IndexedDB (PRD), so this is
// only hit on an explicit "Check Status" tap with a stale/empty cache.

const AEROAPI_BASE = 'https://aeroapi.flightaware.com/aeroapi'

function normIdent(s) {
  return String(s || '').toUpperCase().replace(/\s+/g, '')
}

function pickFlight(flights, target) {
  if (!flights?.length) return null
  if (!target) return flights[0]
  let best = flights[0]
  let bestDiff = Infinity
  for (const f of flights) {
    const t = f.scheduled_out || f.scheduled_off || f.scheduled_in
    if (!t) continue
    const diff = Math.abs(new Date(t).getTime() - target.getTime())
    if (diff < bestDiff) {
      bestDiff = diff
      best = f
    }
  }
  return best
}

function place(p) {
  if (!p) return null
  return { code: p.code_iata || p.code || null, gate: p.gate || null, terminal: p.terminal || null }
}

// Reduce AeroAPI's large flight object to just what the card renders.
function shape(f) {
  return {
    ident: f.ident || null,
    status: f.status || null, // e.g. "Scheduled", "En Route / On Time", "Arrived / Delayed"
    cancelled: Boolean(f.cancelled),
    diverted: Boolean(f.diverted),
    progress_percent: f.progress_percent ?? null,
    origin: place(f.origin),
    destination: place(f.destination),
    scheduled_out: f.scheduled_out || null,
    estimated_out: f.estimated_out || null,
    actual_out: f.actual_out || null,
    scheduled_in: f.scheduled_in || null,
    estimated_in: f.estimated_in || null,
    actual_in: f.actual_in || null,
    departure_delay: f.departure_delay ?? null, // seconds, +late / -early
    arrival_delay: f.arrival_delay ?? null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await getUser(req)
  } catch (err) {
    failAuth(res, err)
    return
  }

  const apiKey = process.env.AEROAPI_KEY
  if (!apiKey) {
    res.status(503).json({
      configured: false,
      error: 'Flight status isn’t set up on the server yet (missing AEROAPI_KEY).',
    })
    return
  }

  const ident = normIdent(req.body?.flight_number)
  if (!ident) {
    res.status(400).json({ error: 'Missing flight number' })
    return
  }

  const target = req.body?.date ? new Date(req.body.date) : new Date()
  if (Number.isNaN(target.getTime())) {
    res.status(400).json({ error: 'Invalid flight date' })
    return
  }

  // AeroAPI only tracks flights within ~2 days of departure. For trips further
  // out there's no live data yet — say so instead of erroring.
  const DAY = 86400000
  const now = Date.now()
  if ((target.getTime() - now) / DAY > 2) {
    res.status(200).json({
      unavailable: true,
      message: 'Live status is available starting about 2 days before departure.',
    })
    return
  }

  // Valid [start, end) window, clamped to AeroAPI's +2-day future bound.
  const start = new Date(target.getTime() - DAY).toISOString()
  const end = new Date(Math.min(target.getTime() + 2 * DAY, now + 2 * DAY)).toISOString()

  try {
    const url =
      `${AEROAPI_BASE}/flights/${encodeURIComponent(ident)}` +
      `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    const r = await fetch(url, { headers: { 'x-apikey': apiKey, Accept: 'application/json' } })

    if (r.status === 404) {
      res.status(404).json({ error: `No flight found for ${ident}.` })
      return
    }
    if (r.status === 401) {
      res.status(502).json({ error: 'Flight status key was rejected by AeroAPI.' })
      return
    }
    // Out-of-range date (too far past/future) → 400. Treat as "no live data".
    if (r.status === 400) {
      res.status(200).json({
        unavailable: true,
        message: 'Live status isn’t available for this flight date.',
      })
      return
    }
    if (!r.ok) {
      res.status(502).json({ error: `Flight status lookup failed (${r.status}).` })
      return
    }

    const data = await r.json()
    const flight = pickFlight(data.flights, target)
    if (!flight) {
      res.status(404).json({ error: `No flight found for ${ident} around that date.` })
      return
    }

    res.status(200).json({ flight: shape(flight), fetched_at: new Date().toISOString() })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Flight status lookup failed' })
  }
}
