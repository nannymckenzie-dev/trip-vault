import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CARD_SECTIONS, CARD_TYPES } from '../lib/cardTypes'
import { formatDateRange, getTripStatus } from '../lib/trips'
import SectionPanel from '../components/SectionPanel'
import ShareModal from '../components/ShareModal'
import SyncStatus from '../components/SyncStatus'
import StatusPill from '../components/StatusPill'
import Spinner from '../components/Spinner'

// File sections now live on their own pages (Phase 3).
const LINK_SECTIONS = [
  { name: 'Tickets', to: 'tickets' },
  { name: 'Documents', to: 'documents' },
  { name: 'Budget', to: 'budget' },
  { name: 'Currency', to: 'currency' },
  { name: 'Import from email', to: 'import' },
]

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [sections, setSections] = useState({}) // { flights: [...], hotels: [...], ... }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [syncedAt, setSyncedAt] = useState(() => {
    const v = localStorage.getItem(`tripvault.synced.${id}`)
    return v ? Number(v) : null
  })

  // Trip-level notes (PRD overview section 9).
  const [notes, setNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: tripData, error: tripErr }, ...cardResults] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      ...CARD_SECTIONS.map((s) =>
        supabase
          .from(CARD_TYPES[s].table)
          .select('*')
          .eq('trip_id', id)
          .order('sort_order', { ascending: true })
      ),
    ])

    if (tripErr) {
      setError(tripErr.message)
      setLoading(false)
      return
    }
    setTrip(tripData)
    setNotes(tripData.notes ?? '')

    const next = {}
    CARD_SECTIONS.forEach((s, i) => {
      next[s] = cardResults[i].data ?? []
    })
    setSections(next)
    setLoading(false)

    // Stamp "last synced" only when we actually reached the network.
    if (navigator.onLine) {
      const now = Date.now()
      localStorage.setItem(`tripvault.synced.${id}`, String(now))
      setSyncedAt(now)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Persist a reordered section: write each row's new sort_order.
  async function handleReorder(section, newItems) {
    setSections((prev) => ({ ...prev, [section]: newItems }))
    const table = CARD_TYPES[section].table
    await Promise.all(
      newItems.map((item, index) =>
        item.sort_order === index
          ? Promise.resolve()
          : supabase.from(table).update({ sort_order: index }).eq('id', item.id)
      )
    )
  }

  async function saveNotes() {
    setNotesSaving(true)
    await supabase.from('trips').update({ notes: notes.trim() || null }).eq('id', id)
    setNotesSaving(false)
    setNotesDirty(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this trip and everything in it? This cannot be undone.'))
      return
    setDeleting(true)
    const { error: delError } = await supabase.from('trips').delete().eq('id', id)
    if (delError) {
      setDeleting(false)
      setError(delError.message)
      return
    }
    navigate('/trips', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <Spinner />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <p className="text-text-soft">{error || 'Trip not found.'}</p>
        <Link to="/trips" className="font-medium text-accent-strong">
          ← Back to trips
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-full bg-bg">
      <div className="brand-grain" />
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link
            to="/trips"
            aria-label="Back to trips"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-dim hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold text-text">{trip.name}</h1>
            <div className="flex items-center gap-2 text-xs text-text-soft">
              <StatusPill status={getTripStatus(trip)} />
              <span className="truncate">{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <p className="truncate text-[11px]">
              <SyncStatus syncedAt={syncedAt} />
            </p>
          </div>
          <button
            onClick={() => setShareOpen(true)}
            className="flex min-h-[44px] shrink-0 items-center rounded-lg border border-accent-strong px-3 text-sm font-semibold text-accent-strong hover:bg-surface-2"
          >
            Share
          </button>
          <Link
            to={`/trips/${id}/edit`}
            className="flex min-h-[44px] shrink-0 items-center rounded-lg bg-accent px-3 text-sm font-bold text-on-accent hover:brightness-95"
          >
            Edit
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-3 px-4 py-5">
        {trip.cover_photo_url && (
          <img
            src={trip.cover_photo_url}
            alt=""
            className="aspect-[16/9] w-full rounded-hero object-cover"
          />
        )}
        {trip.destination && <p className="px-1 text-text-soft">{trip.destination}</p>}

        {CARD_SECTIONS.map((s) => (
          <SectionPanel
            key={s}
            type={CARD_TYPES[s]}
            items={sections[s] ?? []}
            tripId={id}
            onReorder={(newItems) => handleReorder(s, newItems)}
          />
        ))}

        {/* Notes — trip-level free-text notepad. */}
        <section className="rounded-card bg-surface p-4 ring-1 ring-line">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display font-semibold text-text">Notes</h2>
            {notesDirty && (
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-on-accent hover:brightness-95 disabled:opacity-60"
              >
                {notesSaving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesDirty(true)
            }}
            placeholder="Anything trip-wide you want to jot down…"
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent"
          />
        </section>

        {/* File sections — link to their own pages. */}
        <div className="space-y-2 pt-1">
          {LINK_SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={`/trips/${id}/${s.to}`}
              className="flex items-center justify-between rounded-card bg-surface px-4 py-3 ring-1 ring-line transition hover:ring-accent"
            >
              <span className="label-caps text-xs text-text" style={{ letterSpacing: '0.14em' }}>
                {s.name}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-dim">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 min-h-[44px] rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-600/10 disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete trip'}
        </button>
      </main>

      {shareOpen && <ShareModal tripId={id} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
