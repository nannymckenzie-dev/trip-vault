import crypto from 'node:crypto'
import { google } from 'googleapis'
import { admin } from './supabaseAdmin.js'

// Gmail is accessed read-only — the app can never send, delete, or modify mail.
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
export const DEFAULT_LABEL = 'Trip Vault'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

// A fresh OAuth2 client per request (these are cheap and hold per-user creds).
export function oauthClient() {
  return new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
    requireEnv('GOOGLE_REDIRECT_URI')
  )
}

// --- Signed OAuth `state` -------------------------------------------------
// The callback is a top-level browser redirect with no Supabase session, so we
// carry the user_id (and the trip we came from) inside a tamper-proof state
// param: base64url(payload).hmac. A short TTL doubles as CSRF protection.

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function signState(payload) {
  const body = { ...payload, t: Date.now(), n: crypto.randomBytes(8).toString('hex') }
  const data = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto
    .createHmac('sha256', requireEnv('OAUTH_STATE_SECRET'))
    .update(data)
    .digest('base64url')
  return `${data}.${sig}`
}

export function verifyState(state) {
  if (typeof state !== 'string' || !state.includes('.')) throw new Error('Bad state')
  const [data, sig] = state.split('.')
  const expected = crypto
    .createHmac('sha256', requireEnv('OAUTH_STATE_SECRET'))
    .update(data)
    .digest('base64url')
  // Constant-time compare; lengths must match for timingSafeEqual.
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Bad state signature')
  }
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
  if (Date.now() - payload.t > STATE_TTL_MS) throw new Error('State expired')
  return payload
}

// --- Per-user Gmail client ------------------------------------------------
// Loads the stored refresh token and returns an authenticated gmail client.
// googleapis transparently uses the refresh token to mint access tokens.
export async function gmailForUser(userId) {
  const { data, error } = await admin
    .from('gmail_connections')
    .select('refresh_token, import_label')
    .eq('user_id', userId)
    .single()

  if (error || !data?.refresh_token) {
    const err = new Error('Gmail not connected')
    err.code = 'NOT_CONNECTED'
    throw err
  }

  const auth = oauthClient()
  auth.setCredentials({ refresh_token: data.refresh_token })
  const gmail = google.gmail({ version: 'v1', auth })
  return { gmail, label: data.import_label || DEFAULT_LABEL }
}
