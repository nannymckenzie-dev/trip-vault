import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client for serverless functions ONLY. The service role
// bypasses RLS, so this module must never be imported into browser code — it
// lives under /api which Vercel builds as serverless functions, not the bundle.

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  // Surfaced at cold start so a misconfigured deploy fails loudly, not silently.
  throw new Error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the function environment.'
  )
}

export const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Validate the caller's Supabase access token (sent as `Authorization: Bearer
// <jwt>`) and return the authenticated user. Throws on any failure so callers
// can map it to a 401.
export async function getUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new Error('Missing bearer token')

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) throw new Error('Invalid or expired session')
  return data.user
}
