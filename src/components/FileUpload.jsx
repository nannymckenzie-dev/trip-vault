import { useRef } from 'react'

// Upload control: a file picker plus (on mobile) a camera-capture button that
// opens the device camera directly via `capture="environment"`.
export default function FileUpload({
  onSelect,
  busy = false,
  accept = 'image/*,application/pdf',
  camera = true,
  label = 'Upload file',
}) {
  const fileRef = useRef(null)
  const camRef = useRef(null)

  function handle(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (file) onSelect(file)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={fileRef} type="file" accept={accept} onChange={handle} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent hover:brightness-95 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? 'Uploading…' : label}
      </button>

      {camera && (
        <>
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handle}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-surface-2 px-4 text-sm font-semibold text-text-soft hover:bg-surface-2 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Camera
          </button>
        </>
      )}
    </div>
  )
}
