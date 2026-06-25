// The sign's double-headed arrow motif (← —— →). Stroke = currentColor, so set
// the colour with a text-* utility. Used as a section divider and the in-transit
// marker between airport codes.
export default function DoubleArrow({ width = 44, className = '', strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 100 16"
      width={width}
      height={(width * 16) / 100}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 8h82" />
      <path d="M9 8l6-4.5M9 8l6 4.5" />
      <path d="M91 8l-6-4.5M91 8l-6 4.5" />
    </svg>
  )
}
