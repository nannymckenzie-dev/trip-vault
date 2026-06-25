import { getUser, admin } from '../_lib/supabaseAdmin.js'
import { DEFAULT_LABEL } from '../_lib/google.js'

// Tells the UI whether Gmail is connected (and which address / label).
export default async function handler(req, res) {
  let user
  try {
    user = await getUser(req)
  } catch {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const { data } = await admin
    .from('gmail_connections')
    .select('gmail_address, import_label')
    .eq('user_id', user.id)
    .maybeSingle()

  res.status(200).json({
    connected: Boolean(data),
    gmail_address: data?.gmail_address || null,
    label: data?.import_label || DEFAULT_LABEL,
  })
}
