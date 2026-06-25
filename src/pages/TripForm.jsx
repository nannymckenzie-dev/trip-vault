import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'

const EMPTY = {
  name: '',
  destination: '',
  start_date: '',
  end_date: '',
  cover_photo_url: '',
  notes: '',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50'
const labelClass =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

// Shared create/edit form. Edit mode is active when an :id param is present.
export default function TripForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let active = true
    supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(fetchError.message)
        else if (data)
          setForm({
            name: data.name ?? '',
            destination: data.destination ?? '',
            start_date: data.start_date ?? '',
            end_date: data.end_date ?? '',
            cover_photo_url: data.cover_photo_url ?? '',
            notes: data.notes ?? '',
          })
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, isEdit])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Normalize empty strings to null so date/text columns stay clean.
    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      cover_photo_url: form.cover_photo_url.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
      setSaving(false)
      setError('End date can’t be before the start date.')
      return
    }

    let result
    if (isEdit) {
      result = await supabase.from('trips').update(payload).eq('id', id).select('id').single()
    } else {
      result = await supabase
        .from('trips')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    navigate(`/trips/${result.data.id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={isEdit ? `/trips/${id}` : '/trips'}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {isEdit ? 'Edit trip' : 'New trip'}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className={labelClass}>
              Trip name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Italy 2026"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="destination" className={labelClass}>
              Destination
            </label>
            <input
              id="destination"
              value={form.destination}
              onChange={(e) => update('destination', e.target.value)}
              placeholder="e.g. Rome & Florence"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start_date" className={labelClass}>
                Start date
              </label>
              <input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="end_date" className={labelClass}>
                End date
              </label>
              <input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cover_photo_url" className={labelClass}>
              Cover photo URL
            </label>
            <input
              id="cover_photo_url"
              type="url"
              value={form.cover_photo_url}
              onChange={(e) => update('cover_photo_url', e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create trip'}
            </button>
            <Link
              to={isEdit ? `/trips/${id}` : '/trips'}
              className="flex min-h-[44px] items-center justify-center rounded-lg px-4 text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
