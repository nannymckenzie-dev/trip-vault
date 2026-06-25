import { getUser, admin } from '../_lib/supabaseAdmin.js'
import { gmailForUser } from '../_lib/google.js'
import { parseEmail } from '../_lib/claudeParse.js'

const MAX_EMAILS_PER_SCAN = 10 // bound Claude calls so we stay under function timeout
const MAX_BODY_CHARS = 12000 // cap tokens sent to Claude

function decode(data) {
  return data ? Buffer.from(data, 'base64url').toString('utf8') : ''
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

// Walk the MIME tree: collect best-effort plain text + any PDF attachment refs.
function extractContent(payload) {
  let plain = ''
  let html = ''
  const attachments = []

  function walk(part) {
    if (!part) return
    const mime = part.mimeType || ''
    const filename = part.filename || ''
    const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(filename)

    if (filename && part.body?.attachmentId && isPdf) {
      attachments.push({ part_id: part.body.attachmentId, filename: filename || 'attachment.pdf', mime: 'application/pdf' })
    } else if (mime === 'text/plain' && part.body?.data) {
      plain += decode(part.body.data) + '\n'
    } else if (mime === 'text/html' && part.body?.data) {
      html += decode(part.body.data) + '\n'
    }
    ;(part.parts || []).forEach(walk)
  }
  walk(payload)

  const body = (plain.trim() || stripHtml(html)).slice(0, MAX_BODY_CHARS)
  return { body, attachments }
}

function subjectOf(payload) {
  const h = (payload?.headers || []).find((x) => x.name?.toLowerCase() === 'subject')
  return h?.value || ''
}

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

  const tripId = req.body?.trip_id
  if (!tripId) {
    res.status(400).json({ error: 'Missing trip_id' })
    return
  }

  let gmail, label
  try {
    ;({ gmail, label } = await gmailForUser(user.id))
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(409).json({ error: 'Gmail not connected' })
      return
    }
    res.status(502).json({ error: 'Could not reach Gmail. Try reconnecting.' })
    return
  }

  try {
    // 1. List labeled messages.
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: `label:"${label}"`,
      maxResults: 50,
    })
    const ids = (list.data.messages || []).map((m) => m.id)

    // 2. Drop ones already resolved (imported or dismissed).
    const { data: done } = await admin
      .from('imported_emails')
      .select('gmail_message_id')
      .eq('user_id', user.id)
    const seen = new Set((done || []).map((r) => r.gmail_message_id))
    const fresh = ids.filter((id) => !seen.has(id))
    const batch = fresh.slice(0, MAX_EMAILS_PER_SCAN)

    // 3. Fetch + parse each.
    const candidates = []
    for (const id of batch) {
      const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
      const subject = subjectOf(msg.data.payload)
      const { body, attachments } = extractContent(msg.data.payload)
      const parsed = await parseEmail({ subject, body, hasPdf: attachments.length > 0 })

      for (const result of parsed.results) {
        candidates.push({
          message_id: id,
          gmail_subject: subject,
          parsed: result,
          attachments,
        })
      }
    }

    res.status(200).json({
      candidates,
      scanned: batch.length,
      remaining: Math.max(0, fresh.length - batch.length),
      total_labeled: ids.length,
    })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Scan failed' })
  }
}
