import { getAdmin } from '../_lib/supabaseAdmin.js'

// Public, unauthenticated read of a shared trip. Uses the service role (bypasses
// RLS) so we control exactly what's exposed: itinerary cards always; tickets /
// documents / budget only if the owner toggled them on. Files are returned as
// short-lived signed URLs — never permanent public URLs (PRD principle #5).

const CARD_TABLES = [
  ['flights', 'flights'],
  ['hotels', 'hotels'],
  ['activities', 'activities'],
  ['restaurants', 'restaurants'],
  ['transport', 'ground_transport'],
]

function clean(row) {
  if (!row) return row
  // Drop ownership/internal columns; the rest is itinerary data meant to share.
  const { user_id, trip_id, last_status_data, last_status_check, ...rest } = row
  return rest
}

async function sign(admin, bucket, path) {
  if (!path) return null
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60)
  return data?.signedUrl || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const token = req.query.token
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Missing token' })
    return
  }

  let admin
  try {
    admin = getAdmin()
  } catch {
    res.status(503).json({ error: 'Sharing is not configured on the server.' })
    return
  }

  const { data: share } = await admin
    .from('share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!share) {
    res.status(404).json({ error: 'This share link is invalid or has been revoked.' })
    return
  }
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    res.status(404).json({ error: 'This share link has expired.' })
    return
  }

  const { data: trip } = await admin
    .from('trips')
    .select('name, destination, start_date, end_date, cover_photo_url, notes')
    .eq('id', share.trip_id)
    .maybeSingle()

  if (!trip) {
    res.status(404).json({ error: 'This trip no longer exists.' })
    return
  }

  const out = {
    trip,
    settings: {
      documents: Boolean(share.include_documents),
      tickets: Boolean(share.include_tickets),
      budget: Boolean(share.include_budget),
    },
    sections: {},
  }

  // Itinerary cards — always part of a share.
  await Promise.all(
    CARD_TABLES.map(async ([key, table]) => {
      const { data } = await admin
        .from(table)
        .select('*')
        .eq('trip_id', share.trip_id)
        .order('sort_order', { ascending: true })
      out.sections[key] = (data || []).map(clean)
    })
  )

  if (share.include_tickets) {
    const { data } = await admin
      .from('tickets')
      .select('*')
      .eq('trip_id', share.trip_id)
      .order('sort_order', { ascending: true })
    out.tickets = await Promise.all(
      (data || []).map(async (t) => ({
        id: t.id,
        name: t.name,
        use_date: t.use_date,
        file_type: t.file_type,
        notes: t.notes,
        url: await sign(admin, 'tickets', t.file_url),
      }))
    )
  }

  if (share.include_documents) {
    const { data } = await admin
      .from('documents')
      .select('*')
      .eq('trip_id', share.trip_id)
      .order('sort_order', { ascending: true })
    out.documents = await Promise.all(
      (data || []).map(async (d) => ({
        id: d.id,
        label: d.label,
        doc_type: d.doc_type,
        file_type: d.file_type,
        provider: d.provider,
        policy_number: d.policy_number,
        emergency_contact: d.emergency_contact,
        coverage_start: d.coverage_start,
        coverage_end: d.coverage_end,
        notes: d.notes,
        url: await sign(admin, 'documents', d.file_url),
      }))
    )
  }

  if (share.include_budget) {
    const [{ data: budget }, { data: entries }] = await Promise.all([
      admin
        .from('trip_budgets')
        .select('total_budget, currency, category_budgets')
        .eq('trip_id', share.trip_id)
        .maybeSingle(),
      admin
        .from('budget_entries')
        .select('amount, currency, category, description, entry_date, paid_by, notes')
        .eq('trip_id', share.trip_id),
    ])
    out.budget = { ...(budget || {}), entries: entries || [] }
  }

  // A revoke or toggle change must take effect immediately — don't let proxies cache.
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json(out)
}
