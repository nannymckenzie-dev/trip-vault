import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCardType, formatMoneyField } from '../lib/cardTypes'
import { categoryForSection } from '../lib/budget'
import { formatDate, formatTime, formatDateTime } from '../lib/datetime'
import { QuickTagPicker } from '../components/QuickTags'
import FlightStatus from '../components/FlightStatus'
import Spinner from '../components/Spinner'

function displayValue(field, row) {
  const v = row[field.name]
  if (v == null || v === '') return ''
  switch (field.type) {
    case 'date':
      return formatDate(v)
    case 'time':
      return formatTime(v)
    case 'datetime':
      return formatDateTime(v)
    case 'money':
      return formatMoneyField(row, field)
    default:
      return String(v)
  }
}

export default function CardDetail() {
  const { id: tripId, section, cardId } = useParams()
  const type = getCardType(section)
  const navigate = useNavigate()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!type) return
    let active = true
    supabase
      .from(type.table)
      .select('*')
      .eq('id', cardId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(fetchError.message)
        else setRow(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [cardId, type])

  if (!type) return <Navigate to={`/trips/${tripId}`} replace />

  async function toggleTags(tags) {
    setRow((r) => ({ ...r, quick_tags: tags })) // optimistic
    await supabase.from(type.table).update({ quick_tags: tags }).eq('id', cardId)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this ${type.singular.toLowerCase()}? This cannot be undone.`))
      return
    setDeleting(true)
    const { error: delError } = await supabase.from(type.table).delete().eq('id', cardId)
    if (delError) {
      setDeleting(false)
      setError(delError.message)
      return
    }
    navigate(`/trips/${tripId}`, { replace: true })
  }

  async function copyConfirmation(text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  if (error || !row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-300">{error || 'Not found.'}</p>
        <Link to={`/trips/${tripId}`} className="font-medium text-sky-600 dark:text-sky-400">
          ← Back to trip
        </Link>
      </div>
    )
  }

  const confField = type.fields.find((f) => f.name === type.confirmationField)
  const confValue = type.confirmationField ? row[type.confirmationField] : null
  const moneyField = type.fields.find((f) => f.type === 'money')
  const moneyValue = moneyField ? row[moneyField.name] : null

  function addToBudget() {
    const p = new URLSearchParams({
      amount: String(moneyValue),
      category: categoryForSection(section),
      description: type.title(row),
    })
    const cur = moneyField.currencyName && row[moneyField.currencyName]
    if (cur) p.set('currency', cur)
    navigate(`/trips/${tripId}/budget?${p.toString()}`)
  }
  const detailFields = type.fields.filter(
    (f) => f.name !== type.confirmationField && f.type !== 'textarea'
  )
  const notesField = type.fields.find((f) => f.type === 'textarea')

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={`/trips/${tripId}`}
            aria-label="Back to trip"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              {type.title(row)}
            </h1>
            {type.subtitle(row) && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {type.subtitle(row)}
              </p>
            )}
          </div>
          <Link
            to={`/trips/${tripId}/${section}/${cardId}/edit`}
            className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
          >
            Edit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {/* Confirmation number — most prominent element (PRD key principle #4). */}
        {confValue && (
          <button
            onClick={() => copyConfirmation(confValue)}
            className="mb-5 flex w-full flex-col items-start rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-sky-400 dark:bg-slate-900 dark:ring-slate-800"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {confField?.label || 'Confirmation'} · tap to copy
            </span>
            <span className="mt-1 select-all text-2xl font-bold tracking-wide text-slate-900 dark:text-slate-50">
              {confValue}
            </span>
            {copied && <span className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Copied!</span>}
          </button>
        )}

        <dl className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {detailFields.map((field) => {
            const val = displayValue(field, row)
            if (!val) return null
            return (
              <div key={field.name} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-slate-500 dark:text-slate-400">{field.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                  {val}
                </dd>
              </div>
            )
          })}
        </dl>

        {section === 'flights' && row.flight_number && (
          <FlightStatus flightNumber={row.flight_number} date={row.depart_datetime} />
        )}

        {moneyValue != null && moneyValue !== '' && (
          <button
            onClick={addToBudget}
            className="mt-4 w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400"
          >
            + Add to budget
          </button>
        )}

        {notesField && row[notesField.name] && (
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {notesField.label}
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {row[notesField.name]}
            </p>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Quick tags
          </p>
          <QuickTagPicker value={row.quick_tags ?? []} onChange={toggleTags} />
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-8 min-h-[44px] rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {deleting ? 'Deleting…' : `Delete ${type.singular.toLowerCase()}`}
        </button>
      </main>
    </div>
  )
}
