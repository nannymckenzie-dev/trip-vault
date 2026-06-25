import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CARD_SECTIONS, CARD_TYPES, formatMoneyField } from '../lib/cardTypes'
import { formatDate, formatTime, formatDateTime, formatMoney } from '../lib/datetime'
import { formatDateRange } from '../lib/trips'
import Wordmark from '../components/Wordmark'
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

function SharedCard({ type, row }) {
  const confValue = type.confirmationField ? row[type.confirmationField] : null
  const detailFields = type.fields.filter(
    (f) => f.name !== type.confirmationField && f.type !== 'textarea'
  )
  const notesField = type.fields.find((f) => f.type === 'textarea')
  return (
    <div className="rounded-card bg-surface p-4 ring-1 ring-line">
      <p className="font-display font-semibold text-text">{type.title(row)}</p>
      {type.subtitle(row) && <p className="text-xs text-text-dim">{type.subtitle(row)}</p>}
      {confValue && (
        <p className="mt-2 text-sm">
          <span className="label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>
            Confirmation
          </span>{' '}
          <span className="select-all font-display font-bold tracking-wide text-text">{confValue}</span>
        </p>
      )}
      <dl className="mt-2 space-y-1">
        {detailFields.map((field) => {
          const val = displayValue(field, row)
          if (!val) return null
          return (
            <div key={field.name} className="flex justify-between gap-4 text-sm">
              <dt className="text-text-dim">{field.label}</dt>
              <dd className="text-right font-medium text-text">{val}</dd>
            </div>
          )
        })}
      </dl>
      {notesField && row[notesField.name] && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-text-soft">{row[notesField.name]}</p>
      )}
    </div>
  )
}

function FileRow({ title, subtitle, url }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3 ring-1 ring-line">
      <div className="min-w-0">
        <p className="truncate font-medium text-text">{title}</p>
        {subtitle && <p className="truncate text-xs text-text-dim">{subtitle}</p>}
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-on-accent hover:brightness-95"
        >
          View
        </a>
      ) : (
        <span className="shrink-0 text-xs text-text-dim">Unavailable</span>
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <Wordmark size={26} />
        <p className="text-text-soft">{error || 'Trip not found.'}</p>
      </div>
    )
  }

  const { trip, settings } = data
  const signTokens = {
    '--color-text': '#2A2724',
    '--color-text-soft': '#4A453F',
    '--color-accent-strong': '#8A5A33',
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Wood header band with the linen brand sign (always light, like the real sign). */}
      <header className="wood-band px-4 pb-9 pt-12">
        <div className="mx-auto max-w-md" style={signTokens}>
          <LabelFrame
            borderColor="#2A2724"
            maskColor="#FBF8F1"
            className="rounded-[10px] bg-[#FBF8F1] px-7 py-7 text-center shadow-2xl"
          >
            <Wordmark full size={40} />
          </LabelFrame>
        </div>
      </header>

      {/* Itinerary banner */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.18em' }}>
            Shared itinerary
          </p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-text">{trip.name}</h1>
              <p className="text-sm text-text-soft">
                {[formatDateRange(trip.start_date, trip.end_date), trip.destination]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span className="shrink-0 rounded-pill border border-line px-2 py-0.5 label-caps text-[9.5px] text-text-dim" style={{ letterSpacing: '0.13em' }}>
              Read only
            </span>
          </div>
          <p className="mt-2 text-center text-[11.5px] italic text-text-dim">
            Read-only. Look, don’t touch — and yes, we’re watching.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {trip.cover_photo_url && (
          <img src={trip.cover_photo_url} alt="" className="aspect-[16/9] w-full rounded-hero object-cover" />
        )}

        {CARD_SECTIONS.map((section) => {
          const items = data.sections?.[section] ?? []
          if (!items.length) return null
          const type = CARD_TYPES[section]
          return (
            <section key={section} className="space-y-2">
              <h2 className="px-1 label-caps text-xs text-text" style={{ letterSpacing: '0.16em' }}>
                {type.plural}
              </h2>
              {items.map((row) => (
                <SharedCard key={row.id} type={type} row={row} />
              ))}
            </section>
          )
        })}

        {settings.tickets && data.tickets?.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 label-caps text-xs text-text" style={{ letterSpacing: '0.16em' }}>Tickets</h2>
            {data.tickets.map((t) => (
              <FileRow key={t.id} title={t.name || 'Ticket'} subtitle={formatDate(t.use_date)} url={t.url} />
            ))}
          </section>
        )}

        {settings.documents && data.documents?.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 label-caps text-xs text-text" style={{ letterSpacing: '0.16em' }}>Documents</h2>
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
            <h2 className="px-1 label-caps text-xs text-text" style={{ letterSpacing: '0.16em' }}>Budget</h2>
            <div className="rounded-card bg-surface p-4 ring-1 ring-line">
              {data.budget.total_budget != null && (
                <p className="mb-2 text-sm text-text-soft">
                  Total budget:{' '}
                  <span className="font-semibold text-text">
                    {formatMoney(data.budget.total_budget, data.budget.currency)}
                  </span>
                </p>
              )}
              {(data.budget.entries ?? []).map((e, i) => (
                <div key={i} className="flex justify-between gap-4 border-t border-line py-2 text-sm first:border-t-0">
                  <span className="text-text-soft">
                    {[e.category, e.description].filter(Boolean).join(' · ') || 'Expense'}
                  </span>
                  <span className="font-medium text-text">{formatMoney(e.amount, e.currency)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-4 text-center">
          <p className="label-caps text-[9.5px] text-text-dim" style={{ letterSpacing: '0.22em' }}>
            Established 2003 · Sarcasm, Sass &amp; Class
          </p>
          <p className="mt-1 text-xs text-text-dim">Kept tidy by m⁶&amp;co · Trip Vault</p>
        </footer>
      </main>
    </div>
  )
}
