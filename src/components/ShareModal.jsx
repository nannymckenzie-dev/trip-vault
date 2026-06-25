import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TOGGLES = [
  { key: 'include_tickets', label: 'Tickets', hint: 'Boarding passes, event tickets' },
  { key: 'include_documents', label: 'Documents', hint: 'Passports, insurance — sensitive' },
  { key: 'include_budget', label: 'Budget', hint: 'Totals and expenses' },
]

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-sky-600 dark:bg-slate-700" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export default function ShareModal({ tripId, onClose }) {
  const [share, setShare] = useState(null) // existing share_tokens row, or null
  const [settings, setSettings] = useState({
    include_tickets: true,
    include_documents: false,
    include_budget: false,
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('share_tokens')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setShare(data)
          setSettings({
            include_tickets: data.include_tickets,
            include_documents: data.include_documents,
            include_budget: data.include_budget,
          })
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tripId])

  async function createLink() {
    setBusy(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('share_tokens')
      .insert({ trip_id: tripId, user_id: user.id, token, ...settings })
      .select()
      .single()
    if (!error) setShare(data)
    setBusy(false)
  }

  // Toggling a live link updates the row immediately; before a link exists it
  // just stages the setting for createLink().
  async function setToggle(key, value) {
    setSettings((s) => ({ ...s, [key]: value }))
    if (share) {
      await supabase.from('share_tokens').update({ [key]: value }).eq('id', share.id)
      setShare((s) => ({ ...s, [key]: value }))
    }
  }

  async function revoke() {
    if (!share) return
    setBusy(true)
    await supabase.from('share_tokens').delete().eq('id', share.id)
    setShare(null)
    setBusy(false)
  }

  const link = share ? `${window.location.origin}/share/${share.token}` : null

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Share trip</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Anyone with the link can view this trip — read-only, no sign-in. Choose what to include.
        </p>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {TOGGLES.map((t) => (
                <Toggle
                  key={t.key}
                  label={t.label}
                  hint={t.hint}
                  checked={settings[t.key]}
                  onChange={(v) => setToggle(t.key, v)}
                />
              ))}
            </div>

            {share ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-700 outline-none dark:text-slate-200"
                  />
                  <button
                    onClick={copy}
                    className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={revoke}
                  disabled={busy}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
                >
                  {busy ? 'Revoking…' : 'Revoke link'}
                </button>
              </div>
            ) : (
              <button
                onClick={createLink}
                disabled={busy}
                className="mt-4 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create share link'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
