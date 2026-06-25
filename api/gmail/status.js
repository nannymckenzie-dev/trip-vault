import { getUser, getAdmin } from '../_lib/supabaseAdmin.js'
import { DEFAULT_LABEL } from '../_lib/google.js'

// Tells the UI whether Gmail is connected (and which address / label). If the
// server isn't configured yet, returns configured:false so the page renders the
// setup state cleanly instead of a scary error.
export default async function handler(req, res) {
  let user
  try {
    user = await getUser(req)
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      res.status(200).json({ connected: false, configured: false })
      return
    }
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const { data } = await getAdmin()
    .from('gmail_connections')
    .select('gmail_address, import_label')
    .eq('user_id', user.id)
    .maybeSingle()

  res.status(200).json({
    configured: true,
    connected: Boolean(data),
    gmail_address: data?.gmail_address || null,
    label: data?.import_label || DEFAULT_LABEL,
  })
}
