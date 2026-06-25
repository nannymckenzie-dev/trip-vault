import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { uploadFile, removeFile } from '../lib/storage'
import { removeCachedFile } from '../lib/offlineFiles'
import { formatDate, toDateInput } from '../lib/datetime'
import FileUpload from '../components/FileUpload'
import FileViewer from '../components/FileViewer'
import OfflineToggle from '../components/OfflineToggle'
import { QuickTagPicker, TagBadges } from '../components/QuickTags'
import Spinner from '../components/Spinner'

const BUCKET = 'tickets'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50'

function fileIcon(type) {
  return type === 'application/pdf' ? '📄' : '🖼️'
}

export default function Tickets() {
  const { id: tripId } = useParams()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // form state object or null
  const [viewing, setViewing] = useState(null) // ticket being viewed

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('tickets')
      .select('*')
      .eq('trip_id', tripId)
      .order('use_date', { ascending: true, nullsFirst: false })
    if (e) setError(e.message)
    else setTickets(data ?? [])
    setLoading(false)
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(ticket) {
    if (!window.confirm('Delete this ticket?')) return
    await supabase.from('tickets').delete().eq('id', ticket.id)
    if (ticket.file_url) {
      await removeFile(BUCKET, ticket.file_url).catch(() => {})
      await removeCachedFile(ticket.file_url).catch(() => {})
    }
    load()
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to={`/trips/${tripId}`} aria-label="Back to trip" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tickets</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <button
          onClick={() => setEditing({ name: '', use_date: '', quick_tags: [], notes: '', file: null })}
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-semibold text-white hover:bg-sky-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Add ticket
        </button>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400 dark:border-slate-800">No tickets yet.</p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => ticket.file_url && setViewing(ticket)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="text-2xl">{fileIcon(ticket.file_type)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{ticket.name || 'Ticket'}</p>
                      {ticket.use_date && <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(ticket.use_date)}</p>}
                      <TagBadges tags={ticket.quick_tags} className="mt-1" />
                    </div>
                  </button>
                </div>
                {ticket.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{ticket.notes}</p>}
                <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-2 dark:border-slate-800">
                  {ticket.file_url && <OfflineToggle bucket={BUCKET} path={ticket.file_url} />}
                  <button onClick={() => setEditing({ ...ticket, quick_tags: ticket.quick_tags ?? [], file: null })} className="text-xs font-medium text-sky-600 dark:text-sky-400">Edit</button>
                  <button onClick={() => handleDelete(ticket)} className="text-xs font-medium text-red-600 dark:text-red-400">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {editing && (
        <TicketEditor
          tripId={tripId}
          userId={user.id}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setLoading(true)
            load()
          }}
        />
      )}

      {viewing && (
        <FileViewer
          bucket={BUCKET}
          path={viewing.file_url}
          fileType={viewing.file_type}
          label={viewing.name || 'Ticket'}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function TicketEditor({ tripId, userId, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial.id)
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setError(null)
    setSaving(true)
    try {
      let file_url = initial.file_url ?? null
      let file_type = initial.file_type ?? null
      if (form.file) {
        file_url = await uploadFile(BUCKET, userId, tripId, form.file)
        file_type = form.file.type
      }
      const payload = {
        name: form.name.trim() || null,
        use_date: form.use_date || null,
        quick_tags: form.quick_tags ?? [],
        notes: form.notes?.trim() || null,
        file_url,
        file_type,
      }
      const res = isEdit
        ? await supabase.from('tickets').update(payload).eq('id', initial.id)
        : await supabase.from('tickets').insert({ ...payload, trip_id: tripId, user_id: userId })
      if (res.error) throw res.error
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <button onClick={onClose} aria-label="Cancel" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500">✕</button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{isEdit ? 'Edit ticket' : 'Add ticket'}</h2>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name / label</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Uffizi Gallery — Sept 14" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Date of use</label>
          <input type="date" value={toDateInput(form.use_date)} onChange={(e) => set('use_date', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ticket file (PDF or image)</label>
          <FileUpload accept="image/*,application/pdf" onSelect={(file) => set('file', file)} label={form.file ? form.file.name : 'Choose file'} />
          {(form.file || initial.file_url) && <p className="mt-1 text-xs text-slate-500">{form.file ? form.file.name : 'Current file kept unless replaced'}</p>}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Quick tags</p>
          <QuickTagPicker value={form.quick_tags} onChange={(t) => set('quick_tags', t)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
        <button onClick={save} disabled={saving} className="min-h-[44px] w-full rounded-lg bg-sky-600 px-4 text-base font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add ticket'}
        </button>
      </div>
    </div>
  )
}
