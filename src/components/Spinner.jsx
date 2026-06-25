export default function Spinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
    />
  )
}
