import { admin } from '../_lib/supabaseAdmin.js'
import { oauthClient, verifyState } from '../_lib/google.js'

// Google redirects here after consent. We verify the signed state, exchange the
// code for tokens, store the refresh token, then bounce back into the app.
export default async function handler(req, res) {
  const appUrl = process.env.VITE_APP_URL || ''

  function backToApp(tripId, query) {
    const path = tripId ? `/trips/${tripId}/import` : '/trips'
    res.redirect(302, `${appUrl}${path}?${query}`)
  }

  let payload
  try {
    payload = verifyState(req.query.state)
  } catch {
    res.redirect(302, `${appUrl}/trips?gmail_error=bad_state`)
    return
  }

  const code = req.query.code
  if (req.query.error || !code) {
    backToApp(payload.trip, `gmail_error=${encodeURIComponent(req.query.error || 'no_code')}`)
    return
  }

  try {
    const auth = oauthClient()
    const { tokens } = await auth.getToken(code)

    // Without a refresh token we can't scan later — surface that clearly.
    if (!tokens.refresh_token) {
      backToApp(payload.trip, 'gmail_error=no_refresh_token')
      return
    }

    // Best-effort lookup of the connected Gmail address for display.
    let gmailAddress = null
    try {
      auth.setCredentials(tokens)
      const info = await auth.getTokenInfo(tokens.access_token)
      gmailAddress = info.email || null
    } catch {
      /* non-fatal */
    }

    const { error } = await admin.from('gmail_connections').upsert(
      {
        user_id: payload.uid,
        gmail_address: gmailAddress,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      },
      { onConflict: 'user_id' }
    )
    if (error) throw error

    backToApp(payload.trip, 'connected=1')
  } catch (err) {
    backToApp(payload.trip, `gmail_error=${encodeURIComponent(err.message || 'exchange_failed')}`)
  }
}
