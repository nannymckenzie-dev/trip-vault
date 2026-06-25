// The sign's corner-broken label border: an inset rectangle whose top & bottom
// edges are interrupted mid-run by short surface-coloured masks. A featured-
// moment treatment — card-detail hero, share-page sign, empty-state frame.
//
// `maskColor` must match the surface the frame sits on (so the break reads as a
// gap in the line). Defaults to the standard raised surface.
export default function LabelFrame({
  children,
  className = '',
  borderColor = 'var(--color-accent)',
  maskColor = 'var(--color-surface)',
  inset = 7,
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute rounded-[9px] border-[1.5px]"
        style={{ inset, borderColor }}
      />
      {/* top & bottom breaks in the border line */}
      <div
        className="pointer-events-none absolute left-1/2 h-1 w-14 -translate-x-1/2"
        style={{ top: inset, marginTop: -2, background: maskColor }}
      />
      <div
        className="pointer-events-none absolute left-1/2 h-1 w-14 -translate-x-1/2"
        style={{ bottom: inset, marginBottom: -2, background: maskColor }}
      />
      {children}
    </div>
  )
}
