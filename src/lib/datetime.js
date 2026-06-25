// Conversion + formatting helpers shared by card forms and detail views.

const pad = (n) => String(n).padStart(2, '0')

// --- Form input <-> DB value -------------------------------------------------

// date column ('YYYY-MM-DD') <-> <input type="date">
export function toDateInput(v) {
  return v ? String(v).slice(0, 10) : ''
}

// time column ('HH:mm:ss') <-> <input type="time"> ('HH:mm')
export function toTimeInput(v) {
  return v ? String(v).slice(0, 5) : ''
}

// timestamptz <-> <input type="datetime-local"> (local wall-clock time)
export function toDateTimeLocalInput(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 16)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

// datetime-local string -> ISO for storage (interprets input as local time)
export function dateTimeLocalToISO(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// --- Display -----------------------------------------------------------------

function parseDateOnly(value) {
  if (!value) return null
  const [y, m, d] = String(value).split('-').map(Number)
  if (!y) return null
  return new Date(y, m - 1, d)
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(v) {
  const d = parseDateOnly(v)
  return d ? dateFmt.format(d) : ''
}

export function formatDateTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : dateTimeFmt.format(d)
}

export function formatTime(v) {
  if (!v) return ''
  const [h, m] = String(v).split(':').map(Number)
  if (Number.isNaN(h)) return ''
  const d = new Date()
  d.setHours(h, m || 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Compact relative time for the "last synced" indicator.
export function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function formatMoney(amount, currency) {
  if (amount == null || amount === '') return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Number(amount))
  } catch {
    return `${amount} ${currency || ''}`.trim()
  }
}
