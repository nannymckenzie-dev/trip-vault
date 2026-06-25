import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CARD_SECTIONS, CARD_TYPES, formatMoneyField } from '../lib/cardTypes'
import { formatDate, formatTime, formatDateTime, formatMoney } from '../lib/datetime'
import { formatDateRange } from '../lib/trips'
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

function SharedCard({ type, row }) {
  const confValue = type.confirmationField ? row[type.confirmationField] : null
  const detailFields = type.fields.filter(
    (f) => f.name !== type.confirmationField && f.type !== 'textarea'
  )
  const notesField = type.fields.find((f) => f.type === 'textarea')
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="font-semibold text-slate-900 dark:text-slate-50">{type.title(row)}</p>
      {type.subtitle(row) && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{type.subtitle(row)}</p>
      )}
      {confValue && (
        <p className="mt-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Confirmation: </span>
          <span className="select-all font-bold tracking-wide text-slate-900 dark:text-slate-50">
            {confValue}
          </span>
        </p>
      )}
      <dl className="mt-2 space-y-1">
        {detailFields.map((field) => {
          const val = displayValue(field, row)
          if (!val) return null
          return (
            <div key={field.name} className="flex justify-between gap-4 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">{field.label}</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{val}</dd>
            </div>
          )
        })}
      </dl>
      {notesField && row[notesField.name] && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {row[notesField.name]}
        </p>
      )}
    </div>
  )
}

function FileRow({ title, subtitle, url }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-50">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          View
        </a>
      ) : (
        <span className="shrink-0 text-xs text-slate-400">Unavailable</span>
      )}
    </div>
  )
}

export default function Share() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/share/${token}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!active) return
        if (!r.ok) setError(body.error || 'This link could not be opened.')
        else setData(body)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load this trip. Check your connection and try again.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center dark:bg-slate-950">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Trip Vault</p>
        <p className="text-slate-600 dark:text-slate-300">{error || 'Trip not found.'}</p>
      </div>
    )
  }

  const { trip, settings } = data

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Shared itinerary · read-only
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{trip.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {[formatDateRange(trip.start_date, trip.end_date), trip.destination]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {trip.cover_photo_url && (
          <img src={trip.cover_photo_url} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
        )}

        {CARD_SECTIONS.map((section) => {
          const items = data.sections?.[section] ?? []
          if (!items.length) return null
          const type = CARD_TYPES[section]
          return (
            <section key={section} className="space-y-2">
              <h2 className="px-1 font-semibold text-slate-900 dark:text-slate-50">{type.plural}</h2>
              {items.map((row) => (
                <SharedCard key={row.id} type={type} row={row} />
              ))}
            </section>
          )
        })}

        {settings.tickets && data.tickets?.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 font-semibold text-slate-900 dark:text-slate-50">Tickets</h2>
            {data.tickets.map((t) => (
              <FileRow key={t.id} title={t.name || 'Ticket'} subtitle={formatDate(t.use_date)} url={t.url} />
            ))}
          </section>
        )}

        {settings.documents && data.documents?.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 font-semibold text-slate-900 dark:text-slate-50">Documents</h2>
            {data.documents.map((d) => (
              <FileRow
                key={d.id}
                title={d.label || d.doc_type || 'Document'}
                subtitle={d.provider || d.doc_type}
                url={d.url}
              />
            ))}
          </section>
        )}

        {settings.budget && data.budget && (
          <section className="space-y-2">
            <h2 className="px-1 font-semibold text-slate-900 dark:text-slate-50">Budget</h2>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              {data.budget.total_budget != null && (
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  Total budget:{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {formatMoney(data.budget.total_budget, data.budget.currency)}
                  </span>
                </p>
              )}
              {(data.budget.entries ?? []).map((e, i) => (
                <div key={i} className="flex justify-between gap-4 border-t border-slate-100 py-2 text-sm first:border-t-0 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">
                    {[e.category, e.description].filter(Boolean).join(' · ') || 'Expense'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatMoney(e.amount, e.currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">Shared from Trip Vault</p>
      </main>
    </div>
  )
}
