import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { authedFetch, startGmailConnect } from '../lib/api'
import { uploadFile } from '../lib/storage'
import { CARD_TYPES } from '../lib/cardTypes'
import {
  targetFor,
  targetLabel,
  buildCardPayload,
  base64ToFile,
} from '../lib/emailImport'
import Field from '../components/Field'
import { QuickTagPicker } from '../components/QuickTags'
import Spinner from '../components/Spinner'

// Ad-hoc field configs for the two file-backed candidate kinds (no CARD_TYPES entry).
const TICKET_FIELDS = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'use_date', label: 'Date of use', type: 'date' },
]
const INSURANCE_FIELDS = [
  { name: 'provider', label: 'Provider', type: 'text' },
  { name: 'policy_number', label: 'Policy number', type: 'text' },
  { name: 'emergency_contact', label: 'Emergency contact', type: 'text' },
  { name: 'coverage_start', label: 'Coverage start', type: 'date' },
  { name: 'coverage_end', label: 'Coverage end', type: 'date' },
]

function fieldsFor(type) {
  const t = targetFor(type)
  if (t.kind === 'card') return CARD_TYPES[t.section].fields
  if (t.kind === 'ticket') return TICKET_FIELDS
  if (t.kind === 'insurance') return INSURANCE_FIELDS
  return []
}

export default function Import() {
  const { id: tripId } = useParams()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanInfo, setScanInfo] = useState(null) // { scanned, remaining, total_labeled }
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [candidates, setCandidates] = useState([])

  // Surface OAuth callback outcome, then strip the query param.
  useEffect(() => {
    if (params.get('connected')) {
      setNotice('Gmail connected.')
      params.delete('connected')
      setParams(params, { replace: true })
    }
    const gErr = params.get('gmail_error')
    if (gErr) {
      setError(`Gmail connection failed: ${gErr.replace(/_/g, ' ')}`)
      params.delete('gmail_error')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const data = await authedFetch('/api/gmail/status')
      setStatus(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function connect() {
    setError(null)
    try {
      await startGmailConnect(tripId)
    } catch (e) {
      setError(e.message)
    }
  }

  async function scan() {
    setError(null)
    setScanning(true)
    try {
      const data = await authedFetch('/api/gmail/scan', {
        method: 'POST',
        body: { trip_id: tripId },
      })
      setScanInfo({ scanned: data.scanned, remaining: data.remaining, total: data.total_labeled })
      setCandidates(
        data.candidates.map((c, i) => ({
          ...c,
          cid: `${c.message_id}:${i}`,
          form: { ...c.parsed.data, quick_tags: [] },
          attachToTickets: c.attachments.length > 0,
          state: 'pending', // pending | saving | saved | dismissed
          err: null,
        }))
      )
      if (data.candidates.length === 0) {
        setNotice(
          data.total_labeled === 0
            ? `No emails found with the "${status?.label}" label.`
            : 'No new emails to import — all labeled emails are already handled.'
        )
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setScanning(false)
    }
  }

  function patch(cid, changes) {
    setCandidates((prev) => prev.map((c) => (c.cid === cid ? { ...c, ...changes } : c)))
  }
  function setField(cid, name, value) {
    setCandidates((prev) =>
      prev.map((c) => (c.cid === cid ? { ...c, form: { ...c.form, [name]: value } } : c))
    )
  }

  // Pull a candidate's first PDF attachment and store it in a bucket.
  async function uploadCandidatePdf(c, bucket) {
    const att = c.attachments[0]
    const { base64 } = await authedFetch('/api/gmail/attachment', {
      method: 'POST',
      body: { message_id: c.message_id, part_id: att.part_id },
    })
    const file = base64ToFile(base64, att.filename, att.mime)
    const path = await uploadFile(bucket, user.id, tripId, file)
    return { file_url: path, file_type: att.mime || 'application/pdf' }
  }

  async function insertAtEnd(table, row) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
    const { error: insErr } = await supabase
      .from(table)
      .insert({ ...row, trip_id: tripId, user_id: user.id, sort_order: count ?? 0 })
    if (insErr) throw insErr
  }

  async function markResolved(messageId, statusVal, parsed) {
    // Upsert by gmail_message_id (a single email may yield several candidates).
    await supabase.from('imported_emails').upsert(
      {
        user_id: user.id,
        trip_id: tripId,
        gmail_message_id: messageId,
        parse_result: { status: statusVal, ...(parsed ? { parsed } : {}) },
      },
      { onConflict: 'gmail_message_id' }
    )
  }

  async function addCandidate(c) {
    patch(c.cid, { state: 'saving', err: null })
    try {
      const t = targetFor(c.parsed.type)

      if (t.kind === 'card') {
        await insertAtEnd(CARD_TYPES[t.section].table, buildCardPayload(t.section, c.form))
        if (c.attachToTickets && c.attachments.length) {
          const file = await uploadCandidatePdf(c, 'tickets')
          await insertAtEnd('tickets', {
            name: c.form.name || c.gmail_subject || 'Ticket',
            ...file,
            quick_tags: [],
          })
        }
      } else if (t.kind === 'ticket') {
        const file = c.attachments.length ? await uploadCandidatePdf(c, 'tickets') : {}
        await insertAtEnd('tickets', {
          name: c.form.name || c.gmail_subject || 'Ticket',
          use_date: c.form.use_date || null,
          ...file,
          quick_tags: [],
        })
      } else if (t.kind === 'insurance') {
        const file = c.attachments.length ? await uploadCandidatePdf(c, 'documents') : {}
        await insertAtEnd('documents', {
          doc_type: 'insurance',
          label: c.form.provider || 'Travel insurance',
          provider: c.form.provider || null,
          policy_number: c.form.policy_number || null,
          emergency_contact: c.form.emergency_contact || null,
          coverage_start: c.form.coverage_start || null,
          coverage_end: c.form.coverage_end || null,
          ...file,
        })
      }

      await markResolved(c.message_id, 'imported', c.parsed)
      patch(c.cid, { state: 'saved' })
    } catch (e) {
      patch(c.cid, { state: 'pending', err: e.message })
    }
  }

  async function dismiss(c) {
    patch(c.cid, { state: 'saving', err: null })
    try {
      await markResolved(c.message_id, 'dismissed')
      patch(c.cid, { state: 'dismissed' })
    } catch (e) {
      patch(c.cid, { state: 'pending', err: e.message })
    }
  }

  if (loadingStatus) {
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
            to={`/trips/${tripId}`}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Import from email</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {notice && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        {!status?.connected ? (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Connect Gmail</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Trip Vault scans Gmail <strong>read-only</strong> for messages you label{' '}
              <span className="font-mono">Trip Vault</span>, then lets you review what it finds
              before anything is saved.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>In Gmail, create a label named <strong>Trip Vault</strong>.</li>
              <li>Apply it to any booking confirmation email.</li>
              <li>Connect below, then tap <em>Scan Gmail</em>.</li>
            </ol>
            <button
              onClick={connect}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Connect Gmail
            </button>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Connected{status.gmail_address ? ` as ${status.gmail_address}` : ''}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Scanning label “{status.label}”
                </p>
              </div>
              <button
                onClick={scan}
                disabled={scanning}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {scanning ? 'Scanning…' : 'Scan Gmail'}
              </button>
            </div>
            {scanInfo && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {scanInfo.total} labeled · parsed {scanInfo.scanned}
                {scanInfo.remaining > 0 && ` · ${scanInfo.remaining} more — scan again to continue`}
              </p>
            )}
          </section>
        )}

        {candidates.map((c) => {
          const t = targetFor(c.parsed.type)
          const fields = fieldsFor(c.parsed.type)
          if (c.state === 'saved' || c.state === 'dismissed') {
            return (
              <div
                key={c.cid}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <span className="truncate text-slate-500 dark:text-slate-400">
                  {c.gmail_subject || targetLabel(c.parsed.type)}
                </span>
                <span
                  className={
                    c.state === 'saved'
                      ? 'shrink-0 font-medium text-emerald-600 dark:text-emerald-400'
                      : 'shrink-0 text-slate-400'
                  }
                >
                  {c.state === 'saved' ? '✓ Added' : 'Dismissed'}
                </span>
              </div>
            )
          }

          return (
            <section
              key={c.cid}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    {targetLabel(c.parsed.type)}
                  </span>
                  <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                    {c.gmail_subject}
                  </p>
                </div>
                {typeof c.parsed.confidence === 'number' && (
                  <span className="shrink-0 text-xs text-slate-400">
                    {Math.round(c.parsed.confidence * 100)}% sure
                  </span>
                )}
              </div>

              {t.kind === 'unknown' ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Couldn’t recognize this as a booking. Dismiss it to skip.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <Field
                      key={field.name}
                      field={field}
                      form={c.form}
                      set={(name, value) => setField(c.cid, name, value)}
                    />
                  ))}

                  {t.kind === 'card' && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Quick tags
                      </p>
                      <QuickTagPicker
                        value={c.form.quick_tags}
                        onChange={(tags) => setField(c.cid, 'quick_tags', tags)}
                      />
                    </div>
                  )}

                  {t.kind === 'card' && c.attachments.length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={c.attachToTickets}
                        onChange={(e) => patch(c.cid, { attachToTickets: e.target.checked })}
                        className="h-4 w-4"
                      />
                      Also save attached PDF ({c.attachments[0].filename}) to Tickets
                    </label>
                  )}
                  {(t.kind === 'ticket' || t.kind === 'insurance') && c.attachments.length > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Attaching {c.attachments[0].filename}
                    </p>
                  )}
                </div>
              )}

              {c.err && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {c.err}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                {t.kind !== 'unknown' && (
                  <button
                    onClick={() => addCandidate(c)}
                    disabled={c.state === 'saving'}
                    className="min-h-[44px] flex-1 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                  >
                    {c.state === 'saving' ? 'Saving…' : `Add ${targetLabel(c.parsed.type).toLowerCase()}`}
                  </button>
                )}
                <button
                  onClick={() => dismiss(c)}
                  disabled={c.state === 'saving'}
                  className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Dismiss
                </button>
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
