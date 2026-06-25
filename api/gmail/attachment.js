import { getUser, failAuth } from '../_lib/supabaseAdmin.js'
import { gmailForUser } from '../_lib/google.js'

// Fetches one PDF attachment's bytes (base64) so the confirm step can upload it
// to ticket storage. The browser never holds Gmail credentials — it asks here.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let user
  try {
    user = await getUser(req)
  } catch (err) {
    failAuth(res, err)
    return
  }

  const { message_id, part_id } = req.body || {}
  if (!message_id || !part_id) {
    res.status(400).json({ error: 'Missing message_id or part_id' })
    return
  }

  try {
    const { gmail } = await gmailForUser(user.id)
    const att = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: message_id,
      id: part_id,
    })
    // Gmail returns base64url; convert to standard base64 for the browser.
    const base64 = Buffer.from(att.data.data, 'base64url').toString('base64')
    res.status(200).json({ base64, mime: 'application/pdf' })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not fetch attachment' })
  }
}
