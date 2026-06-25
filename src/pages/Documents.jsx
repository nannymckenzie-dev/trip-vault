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
import Spinner from '../components/Spinner'

const BUCKET = 'documents'
const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'

const DOC_SECTIONS = [
  { type: 'passport', title: 'Passports', hint: 'Photo/scan per traveler' },
  { type: 'visa', title: 'Visas', hint: 'Photo/scan per country' },
  { type: 'insurance', title: 'Travel Insurance', hint: 'Policy PDF or photo' },
  { type: 'other', title: 'Other Documents', hint: 'Labeled free-form uploads' },
]

const fileIcon = (type) => (type === 'application/pdf' ? '📄' : '🖼️')

export default function Documents() {
  const { id: tripId } = useParams()
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from('documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true })
    if (e) setError(e.message)
    else setDocs(data ?? [])
    setLoading(false)
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(doc) {
    if (!window.confirm('Delete this document?')) return
    await supabase.from('documents').delete().eq('id', doc.id)
    if (doc.file_url) {
      await removeFile(BUCKET, doc.file_url).catch(() => {})
      await removeCachedFile(doc.file_url).catch(() => {})
    }
    load()
  }

  const byType = (type) => docs.filter((d) => d.doc_type === type)

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to={`/trips/${tripId}`} aria-label="Back to trip" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-text-dim hover:text-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <h1 className="text-lg font-semibold text-text">Documents</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
        ) : (
          DOC_SECTIONS.map((section) => {
            const items = byType(section.type)
            return (
              <section key={section.type} className="rounded-2xl bg-surface ring-1 ring-line">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h2 className="font-semibold text-text">{section.title}</h2>
                    <p className="text-xs text-text-dim">{section.hint}</p>
                  </div>
                  <button
                    onClick={() => setEditing(blankDoc(section.type))}
                    className="flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-accent-strong hover:bg-surface-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                    Add
                  </button>
                </div>

                {items.length > 0 && (
                  <ul className="divide-y divide-line border-t border-line">
                    {items.map((doc) => (
                      <li key={doc.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <button onClick={() => doc.file_url && setViewing(doc)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="text-2xl">{fileIcon(doc.file_type)}</span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-text">{doc.label || section.title}</p>
                              {doc.doc_type === 'insurance' && doc.emergency_contact && (
                                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                  Emergency: {doc.emergency_contact}
                                </p>
                              )}
                              {doc.doc_type === 'insurance' && doc.provider && (
                                <p className="text-xs text-text-dim">
                                  {doc.provider}
                                  {doc.policy_number ? ` · #${doc.policy_number}` : ''}
                                </p>
                              )}
                            </div>
                          </button>
                        </div>
                        {doc.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-text-soft">{doc.notes}</p>}
                        <div className="mt-2 flex items-center gap-4">
                          {doc.file_url && <OfflineToggle bucket={BUCKET} path={doc.file_url} />}
                          <button onClick={() => setEditing({ ...doc, file: null })} className="text-xs font-medium text-accent-strong">Edit</button>
                          <button onClick={() => handleDelete(doc)} className="text-xs font-medium text-red-600 dark:text-red-400">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })
        )}
      </main>

      {editing && (
        <DocumentEditor
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
        <FileViewer bucket={BUCKET} path={viewing.file_url} fileType={viewing.file_type} label={viewing.label || 'Document'} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function blankDoc(type) {
  return {
    doc_type: type,
    label: '',
    notes: '',
    policy_number: '',
    provider: '',
    emergency_contact: '',
    coverage_start: '',
    coverage_end: '',
    file: null,
  }
}

function DocumentEditor({ tripId, userId, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial.id)
  const isInsurance = initial.doc_type === 'insurance'
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
        doc_type: form.doc_type,
        label: form.label?.trim() || null,
        notes: form.notes?.trim() || null,
        file_url,
        file_type,
        policy_number: isInsurance ? form.policy_number?.trim() || null : null,
        provider: isInsurance ? form.provider?.trim() || null : null,
        emergency_contact: isInsurance ? form.emergency_contact?.trim() || null : null,
        coverage_start: isInsurance ? form.coverage_start || null : null,
        coverage_end: isInsurance ? form.coverage_end || null : null,
      }
      const res = isEdit
        ? await supabase.from('documents').update(payload).eq('id', initial.id)
        : await supabase.from('documents').insert({ ...payload, trip_id: tripId, user_id: userId })
      if (res.error) throw res.error
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', props = {}) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-soft">{label}</label>
      <input
        type={type}
        value={type === 'date' ? toDateInput(form[key]) : form[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
        {...props}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onClose} aria-label="Cancel" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-text-dim">✕</button>
        <h2 className="text-lg font-semibold text-text">
          {isEdit ? 'Edit document' : 'Add document'}
        </h2>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {field('Label / traveler name', 'label')}

        <div>
          <label className="mb-1 block text-sm font-medium text-text-soft">File (photo or PDF)</label>
          <FileUpload accept="image/*,application/pdf" onSelect={(file) => set('file', file)} label={form.file ? form.file.name : 'Choose file'} />
          {(form.file || initial.file_url) && <p className="mt-1 text-xs text-text-dim">{form.file ? form.file.name : 'Current file kept unless replaced'}</p>}
        </div>

        {isInsurance && (
          <>
            {field('Policy number', 'policy_number')}
            {field('Provider name', 'provider')}
            {field('Emergency contact number', 'emergency_contact', 'tel')}
            <div className="grid grid-cols-2 gap-3">
              {field('Coverage start', 'coverage_start', 'date')}
              {field('Coverage end', 'coverage_end', 'date')}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-text-soft">Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>}
        <button onClick={save} disabled={saving} className="min-h-[44px] w-full rounded-lg bg-accent px-4 text-base font-semibold text-on-accent hover:brightness-95 disabled:opacity-60">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add document'}
        </button>
      </div>
    </div>
  )
}
