import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCardType, formatMoneyField } from '../lib/cardTypes'
import { categoryForSection } from '../lib/budget'
import { formatDate, formatTime, formatDateTime } from '../lib/datetime'
import { QuickTagPicker } from '../components/QuickTags'
import FlightStatus from '../components/FlightStatus'
import LabelFrame from '../components/LabelFrame'
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
      <div className="flex h-full items-center justify-center bg-bg">
        <Spinner />
      </div>
    )
  }

  if (error || !row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <p className="text-text-soft">{error || 'Not found.'}</p>
        <Link to={`/trips/${tripId}`} className="font-medium text-accent-strong">
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
    <div className="relative min-h-full bg-bg">
      <div className="brand-grain" />
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={`/trips/${tripId}`}
            aria-label="Back to trip"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-text-dim hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate label-caps text-sm text-text" style={{ letterSpacing: '0.16em' }}>
              {type.singular}
            </h1>
            {type.subtitle(row) && (
              <p className="truncate text-xs text-text-dim">{type.subtitle(row)}</p>
            )}
          </div>
          <Link
            to={`/trips/${tripId}/${section}/${cardId}/edit`}
            className="flex min-h-[44px] items-center rounded-lg bg-accent px-3 text-sm font-bold text-on-accent hover:brightness-95"
          >
            Edit
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-4 py-5">
        {/* Confirmation number — most prominent element (PRD key principle #4). */}
        {confValue && (
          <LabelFrame className="mb-5">
            <button
              onClick={() => copyConfirmation(confValue)}
              className="flex w-full flex-col items-center rounded-hero bg-surface px-4 py-6 text-center shadow-[0_6px_18px_rgba(42,39,36,.10)] ring-1 ring-line transition hover:ring-accent"
            >
              <span className="label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.2em' }}>
                {confField?.label || 'Confirmation'}
              </span>
              <span className="mt-2 select-all font-display text-4xl font-bold text-text" style={{ letterSpacing: '0.07em' }}>
                {confValue}
              </span>
              <span className="mt-2 text-xs text-text-dim">
                {copied ? (
                  <span className="text-sage">Copied!</span>
                ) : (
                  'Tap to copy'
                )}
              </span>
            </button>
          </LabelFrame>
        )}

        <dl className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
          {detailFields.map((field) => {
            const val = displayValue(field, row)
            if (!val) return null
            return (
              <div key={field.name} className="flex justify-between gap-4 px-4 py-3">
                <dt className="label-caps text-[10.5px] text-text-dim" style={{ letterSpacing: '0.12em' }}>
                  {field.label}
                </dt>
                <dd className="text-right text-sm font-medium text-text">{val}</dd>
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
            className="mt-4 w-full rounded-card border-2 border-dashed border-line py-3 text-sm font-medium text-text-dim transition hover:border-accent hover:text-accent-strong"
          >
            + Add to budget
          </button>
        )}

        {notesField && row[notesField.name] && (
          <div className="mt-4 rounded-card bg-surface p-4 ring-1 ring-line">
            <p className="mb-1 label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>
              {notesField.label}
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-soft">{row[notesField.name]}</p>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>
            Quick tags
          </p>
          <QuickTagPicker value={row.quick_tags ?? []} onChange={toggleTags} />
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-8 min-h-[44px] rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-600/10 disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : `Delete ${type.singular.toLowerCase()}`}
        </button>
      </main>
    </div>
  )
}
