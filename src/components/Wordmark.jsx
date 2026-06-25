import DoubleArrow from './Arrow'

// The m⁶&co lockup. Inline by default (headers); `full` renders the stacked sign
// lockup (ESTABLISHED 2003 · m⁶&co · double-arrow · SARCASM SASS & CLASS) for the
// share page and big empty states.
export default function Wordmark({ size = 23, full = false, className = '' }) {
  const lockup = (
    <span
      className="font-display font-semibold leading-none tracking-[-0.012em] text-text"
      style={{ fontSize: size }}
    >
      m
      <sup
        className="font-display text-accent-strong"
        style={{ fontSize: '0.46em', top: '-0.55em', position: 'relative' }}
      >
        6
      </sup>
      <span>&amp;co</span>
    </span>
  )

  if (!full) return <span className={className}>{lockup}</span>

  return (
    <span className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="label-caps text-[10px] text-text-soft" style={{ letterSpacing: '0.36em' }}>
        Established 2003
      </span>
      {lockup}
      <DoubleArrow width={size * 2.6} className="text-text" />
      <span className="label-caps text-[9px] text-text-soft" style={{ letterSpacing: '0.28em' }}>
        Sarcasm · Sass &amp; Class
      </span>
    </span>
  )
}
