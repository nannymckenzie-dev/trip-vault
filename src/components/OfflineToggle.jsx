import { useEffect, useState } from 'react'
import { downloadBlob } from '../lib/storage'
import { cacheFile, isCached, removeCachedFile } from '../lib/offlineFiles'

// Per-file "Save offline" control + cached indicator (green check).
export default function OfflineToggle({ bucket, path }) {
  const [cached, setCached] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    isCached(path).then((v) => active && setCached(v))
    return () => {
      active = false
    }
  }, [path])

  async function toggle() {
    setBusy(true)
    try {
      if (cached) {
        await removeCachedFile(path)
        setCached(false)
      } else {
        const blob = await downloadBlob(bucket, path)
        await cacheFile(path, blob)
        setCached(true)
      }
    } catch {
      /* offline or download failed — leave state as-is */
    }
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={cached ? 'Saved offline — tap to remove' : 'Save for offline'}
      className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-medium disabled:opacity-50 ${
        cached
          ? 'text-sage'
          : 'text-text-dim hover:text-text'
      }`}
    >
      {cached ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 16V4M7 11l5 5 5-5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {busy ? '…' : cached ? 'Offline' : 'Save offline'}
    </button>
  )
}
