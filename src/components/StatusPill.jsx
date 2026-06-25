import { TRIP_STATUS } from '../lib/trips'

// Stamped-label status chip (slightly rounded, not fully round) per the brand.
const CONFIG = {
  [TRIP_STATUS.IN_PROGRESS]: { cls: 'border-accent text-accent-strong', tint: 'var(--color-accent)', dot: true },
  [TRIP_STATUS.UPCOMING]: { cls: 'border-sage text-sage', tint: 'var(--color-sage)', dot: false },
  [TRIP_STATUS.PAST]: { cls: 'border-line text-text-dim', tint: 'var(--color-text-dim)', dot: false },
}

export default function StatusPill({ status, className = '' }) {
  const c = CONFIG[status] || CONFIG[TRIP_STATUS.UPCOMING]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[9.5px] label-caps ${c.cls} ${className}`}
      style={{ backgroundColor: `color-mix(in srgb, ${c.tint} 16%, transparent)`, letterSpacing: '0.13em' }}
    >
      {c.dot && <span className="text-[7px] leading-none">●</span>}
      {status}
    </span>
  )
}
