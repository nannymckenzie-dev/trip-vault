import { getUser } from '../_lib/supabaseAdmin.js'
import { oauthClient, signState, GMAIL_SCOPE } from '../_lib/google.js'

// Builds the Gmail OAuth consent URL. Called via POST with the user's Supabase
// JWT; we verify it, sign a state param carrying the user_id + the trip to
// return to, and return the URL for the browser to navigate to.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let user
  try {
    user = await getUser(req)
  } catch {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const tripId = typeof req.body?.trip_id === 'string' ? req.body.trip_id : null
  const state = signState({ uid: user.id, trip: tripId })

  const url = oauthClient().generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh-token issuance on re-consent
    scope: [GMAIL_SCOPE],
    state,
    include_granted_scopes: true,
  })

  res.status(200).json({ url })
}
