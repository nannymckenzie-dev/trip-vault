import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getCardType, payloadColumns } from '../lib/cardTypes'
import { dateTimeLocalToISO } from '../lib/datetime'
import Field from '../components/Field'
import { QuickTagPicker } from '../components/QuickTags'
import Spinner from '../components/Spinner'

// Build a clean DB payload from the form state, coercing each field by type.
function buildPayload(type, form) {
  const payload = {}
  for (const field of type.fields) {
    const raw = form[field.name]
    switch (field.type) {
      case 'datetime':
        payload[field.name] = dateTimeLocalToISO(raw)
        break
      case 'number':
        payload[field.name] = raw === '' || raw == null ? null : Number(raw)
        break
      case 'money':
        payload[field.name] = raw === '' || raw == null ? null : Number(raw)
        payload[field.currencyName] =
          payload[field.name] == null ? null : form[field.currencyName] || 'USD'
        break
      default:
        payload[field.name] =
          typeof raw === 'string' ? raw.trim() || null : raw ?? null
    }
  }
  payload.quick_tags = form.quick_tags ?? []
  return payload
}

export default function CardForm() {
  const { id: tripId, section, cardId } = useParams()
  const type = getCardType(section)
  const isEdit = Boolean(cardId)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ quick_tags: [] })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit || !type) return
    let active = true
    supabase
      .from(type.table)
      .select('*')
      .eq('id', cardId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(fetchError.message)
        else if (data) setForm({ ...data, quick_tags: data.quick_tags ?? [] })
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [cardId, isEdit, type])

  if (!type) return <Navigate to={`/trips/${tripId}`} replace />

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = buildPayload(type, form)

    let result
    if (isEdit) {
      result = await supabase
        .from(type.table)
        .update(payload)
        .eq('id', cardId)
        .select('id')
        .single()
    } else {
      // Append to the end of the section.
      const { count } = await supabase
        .from(type.table)
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', tripId)
      result = await supabase
        .from(type.table)
        .insert({
          ...payload,
          trip_id: tripId,
          user_id: user.id,
          sort_order: count ?? 0,
        })
        .select('id')
        .single()
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    navigate(`/trips/${tripId}/${section}/${result.data.id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  const cancelTo = isEdit
    ? `/trips/${tripId}/${section}/${cardId}`
    : `/trips/${tripId}`

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={cancelTo}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {isEdit ? `Edit ${type.singular.toLowerCase()}` : `Add ${type.singular.toLowerCase()}`}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {type.fields.map((field) => (
            <Field key={field.name} field={field} form={form} set={set} />
          ))}

          <div>
            <p className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quick tags
            </p>
            <QuickTagPicker
              value={form.quick_tags}
              onChange={(tags) => set('quick_tags', tags)}
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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : `Add ${type.singular.toLowerCase()}`}
            </button>
            <Link
              to={cancelTo}
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
