import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BUDGET_CATEGORIES } from '../lib/budget'
import { getCachedRates, convert, currencyList } from '../lib/currency'
import { formatMoney, formatDate } from '../lib/datetime'
import Spinner from '../components/Spinner'

const todayISO = () => new Date().toISOString().slice(0, 10)

// Sum entries into the budget currency, converting via cached rates. `approx`
// flags that at least one entry's currency couldn't be converted (counted at
// face value as a best effort).
function sumConverted(entries, ccy, rates) {
  let total = 0
  let approx = false
  for (const e of entries) {
    if (e.amount == null || e.amount === '') continue
    const amt = Number(e.amount)
    if (!e.currency || e.currency === ccy) {
      total += amt
      continue
    }
    const v = convert(amt, e.currency, ccy, rates)
    if (v == null) {
      total += amt
      approx = true
    } else {
      total += v
    }
  }
  return { total, approx }
}

function ExpenseForm({ initial, currencyOptions, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50'

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Amount</span>
          <input
            type="number"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="w-28">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Currency</span>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</span>
        <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
          {BUDGET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</span>
        <input value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} />
      </label>
      <div className="mt-3 flex gap-2">
        <label className="flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</span>
          <input type="date" value={form.entry_date || ''} onChange={(e) => set('entry_date', e.target.value)} className={inputCls} />
        </label>
        <label className="flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid by</span>
          <input value={form.paid_by} onChange={(e) => set('paid_by', e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.amount}
          className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save expense'}
        </button>
        <button onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Budget() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()

  const [budget, setBudget] = useState(null)
  const [entries, setEntries] = useState([])
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState(null)

  // Budget setup form state.
  const [total, setTotal] = useState('')
  const [budgetCcy, setBudgetCcy] = useState('USD')

  const load = useCallback(async () => {
    const [{ data: b }, { data: e }, cached] = await Promise.all([
      supabase.from('trip_budgets').select('*').eq('trip_id', id).maybeSingle(),
      supabase.from('budget_entries').select('*').eq('trip_id', id).order('entry_date', { ascending: false }),
      getCachedRates(),
    ])
    setBudget(b || null)
    setEntries(e || [])
    setRates(cached?.rates || null)
    if (b) {
      setTotal(b.total_budget ?? '')
      setBudgetCcy(b.currency || 'USD')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Open the add form pre-filled when arriving from a card's "Add to budget".
  useEffect(() => {
    if (params.get('amount')) setAddOpen(true)
  }, [params])

  const ccy = budget?.currency || budgetCcy || 'USD'
  const ccyOptions = currencyList(rates)
  const { total: spent, approx } = sumConverted(entries, ccy, rates)
  const totalBudget = Number(budget?.total_budget) || 0
  const pct = totalBudget > 0 ? Math.min(100, (spent / totalBudget) * 100) : 0
  const barColor = !totalBudget
    ? 'bg-slate-400'
    : spent > totalBudget
      ? 'bg-red-500'
      : pct > 80
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  // Per-category spent.
  const byCategory = {}
  for (const cat of BUDGET_CATEGORIES) {
    const sub = sumConverted(entries.filter((e) => e.category === cat), ccy, rates).total
    if (sub > 0 || budget?.category_budgets?.[cat]) byCategory[cat] = sub
  }

  async function saveBudget() {
    setSaving(true)
    const payload = { trip_id: id, total_budget: total === '' ? null : Number(total), currency: budgetCcy }
    if (budget) {
      await supabase.from('trip_budgets').update(payload).eq('id', budget.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('trip_budgets').insert({ ...payload, user_id: user.id })
    }
    setEditingBudget(false)
    setSaving(false)
    load()
  }

  async function saveEntry(form) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      amount: form.amount === '' ? null : Number(form.amount),
      currency: form.currency || null,
      category: form.category,
      description: form.description?.trim() || null,
      entry_date: form.entry_date || null,
      paid_by: form.paid_by?.trim() || null,
    }
    if (editId) {
      await supabase.from('budget_entries').update(payload).eq('id', editId)
    } else {
      await supabase.from('budget_entries').insert({ ...payload, trip_id: id, user_id: user.id })
    }
    setSaving(false)
    setAddOpen(false)
    setEditId(null)
    if (params.get('amount')) setParams({}, { replace: true })
    load()
  }

  async function deleteEntry(entryId) {
    if (!window.confirm('Delete this expense?')) return
    await supabase.from('budget_entries').delete().eq('id', entryId)
    load()
  }

  function newEntryInitial() {
    return {
      amount: params.get('amount') || '',
      currency: params.get('currency') || ccy,
      category: params.get('category') || 'Other',
      description: params.get('description') || '',
      entry_date: todayISO(),
      paid_by: '',
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50'

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to={`/trips/${id}`}
            aria-label="Back to trip"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="flex-1 text-lg font-semibold text-slate-900 dark:text-slate-50">Budget</h1>
          <Link to={`/trips/${id}/currency`} className="text-sm font-medium text-sky-600 dark:text-sky-400">
            Currency →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Budget summary / setup */}
        {!budget && !editingBudget ? (
          <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-slate-600 dark:text-slate-300">No budget set for this trip yet.</p>
            <button
              onClick={() => setEditingBudget(true)}
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Set a budget
            </button>
          </div>
        ) : editingBudget ? (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Total budget</span>
                <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={inputCls} />
              </label>
              <label className="w-28">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Currency</span>
                <select value={budgetCcy} onChange={(e) => setBudgetCcy(e.target.value)} className={inputCls}>
                  {ccyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={saveBudget} disabled={saving} className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save budget'}
              </button>
              <button onClick={() => setEditingBudget(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatMoney(spent, ccy)}</span>
              <button onClick={() => setEditingBudget(true)} className="text-sm font-medium text-sky-600 dark:text-sky-400">
                Edit
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              spent of {formatMoney(totalBudget, ccy)} budget
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            {totalBudget > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                {spent > totalBudget
                  ? `${formatMoney(spent - totalBudget, ccy)} over budget`
                  : `${formatMoney(totalBudget - spent, ccy)} remaining`}
              </p>
            )}
            {approx && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Some expenses are in currencies without a saved rate — totals are approximate.
                Open Currency and Refresh rates.
              </p>
            )}
          </div>
        )}

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">By category</h2>
            <div className="space-y-1.5">
              {Object.entries(byCategory).map(([cat, amt]) => {
                const sub = budget?.category_budgets?.[cat]
                return (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(amt, ccy)}
                      {sub ? <span className="text-slate-400"> / {formatMoney(sub, ccy)}</span> : null}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add expense */}
        {addOpen || editId ? (
          <ExpenseForm
            initial={
              editId
                ? (() => {
                    const e = entries.find((x) => x.id === editId)
                    return {
                      amount: e.amount ?? '',
                      currency: e.currency || ccy,
                      category: e.category || 'Other',
                      description: e.description || '',
                      entry_date: e.entry_date || todayISO(),
                      paid_by: e.paid_by || '',
                    }
                  })()
                : newEntryInitial()
            }
            currencyOptions={ccyOptions}
            onSave={saveEntry}
            onCancel={() => {
              setAddOpen(false)
              setEditId(null)
              if (params.get('amount')) setParams({}, { replace: true })
            }}
            saving={saving}
          />
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400"
          >
            + Add expense
          </button>
        )}

        {/* Entries list */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-50">
                    {e.description || e.category}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {[e.category, formatDate(e.entry_date), e.paid_by && `· ${e.paid_by}`].filter(Boolean).join(' ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatMoney(e.amount, e.currency)}
                  </span>
                  <button onClick={() => { setEditId(e.id); setAddOpen(false) }} aria-label="Edit" className="ml-1 rounded-md px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40">
                    Edit
                  </button>
                  <button onClick={() => deleteEntry(e.id)} aria-label="Delete" className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
