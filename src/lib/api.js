import { supabase } from './supabase'

// Attaches the current Supabase access token to a call against our own /api
// serverless functions, which authenticate via `Authorization: Bearer <jwt>`.
export async function authedFetch(path, { method = 'GET', body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not signed in')

  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// Starts the Gmail OAuth flow: POST (header-authed) to get the Google consent
// URL, then navigate the whole page to it. Keeps the access token out of URLs.
export async function startGmailConnect(tripId) {
  const { url } = await authedFetch('/api/gmail/connect', {
    method: 'POST',
    body: { trip_id: tripId },
  })
  window.location.href = url
}

// Live flight status (AeroAPI, server-side). Caching is the caller's job
// (src/lib/flightCache.js) so this stays a thin pass-through.
export async function fetchFlightStatus(flightNumber, date) {
  return authedFetch('/api/flights/status', {
    method: 'POST',
    body: { flight_number: flightNumber, date },
  })
}
