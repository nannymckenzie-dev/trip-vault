import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '../lib/storage'
import { getCachedFile } from '../lib/offlineFiles'
import PinchPanZoom from './PinchPanZoom'
import Spinner from './Spinner'

// Full-screen viewer for images and PDFs. Reads from the offline cache first
// (so saved files open with no network), else downloads from the private
// bucket. PDFs render in-app via pdf.js — no external app, no browser handler.
export default function FileViewer({ bucket, path, fileType, label, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [imgUrl, setImgUrl] = useState(null)
  const pdfContainer = useRef(null)
  const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(path || '')

  useEffect(() => {
    let active = true
    let objectUrl = null

    async function load() {
      try {
        const cached = await getCachedFile(path)
        const blob = cached?.blob ?? (await downloadBlob(bucket, path))
        if (!active) return

        if (isPdf) {
          const { renderPdfToCanvases } = await import('../lib/pdf')
          const canvases = await renderPdfToCanvases(blob)
          if (!active) return
          const host = pdfContainer.current
          if (host) {
            host.innerHTML = ''
            canvases.forEach((c) => host.appendChild(c))
          }
        } else {
          objectUrl = URL.createObjectURL(blob)
          setImgUrl(objectUrl)
        }
        setLoading(false)
      } catch (e) {
        if (active) {
          setError(e.message || 'Could not open file')
          setLoading(false)
        }
      }
    }
    load()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bucket, path, isPdf])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="truncate text-sm font-medium">{label}</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {!error && (
          <PinchPanZoom>
            {isPdf ? (
              <div ref={pdfContainer} className="max-h-full overflow-auto py-2" />
            ) : imgUrl ? (
              <img src={imgUrl} alt={label} className="max-h-full max-w-full object-contain" />
            ) : null}
          </PinchPanZoom>
        )}
      </div>
    </div>
  )
}
