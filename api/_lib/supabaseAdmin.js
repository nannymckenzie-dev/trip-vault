import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client for serverless functions ONLY. The service role
// bypasses RLS, so this module must never be imported into browser code — it
// lives under /api which Vercel builds as serverless functions, not the bundle.

let _admin

// Lazily build the client so a missing-config doesn't crash the function at
// import time (which surfaces as an opaque 500). Callers catch NOT_CONFIGURED
// and turn it into a clear message.
export function getAdmin() {
  if (_admin) return _admin
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    const err = new Error(
      'Email import is not configured on the server yet (missing SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_URL).'
    )
    err.code = 'NOT_CONFIGURED'
    throw err
  }
  _admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}

// Validate the caller's Supabase access token (sent as `Authorization: Bearer
// <jwt>`) and return the authenticated user. Throws a coded error so callers
// can distinguish "not set up" (503) from "not signed in" (401).
export async function getUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    const err = new Error('Missing bearer token')
    err.code = 'UNAUTHENTICATED'
    throw err
  }
  const { data, error } = await getAdmin().auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Invalid or expired session')
    err.code = 'UNAUTHENTICATED'
    throw err
  }
  return data.user
}

// Map a thrown auth/config error to an HTTP response. NOT_CONFIGURED → 503 with
// a clear message; anything else → 401.
export function failAuth(res, err) {
  if (err?.code === 'NOT_CONFIGURED') {
    res.status(503).json({ error: err.message })
    return
  }
  res.status(401).json({ error: 'Not authenticated' })
}
