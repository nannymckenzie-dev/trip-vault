import { useRef, useState, useCallback } from 'react'

// Touch + mouse pinch/zoom/pan container. Tracks active pointers; one pointer
// pans, two pointers pinch-zoom around their midpoint. Wheel zooms, double-tap
// toggles between fit and 2x. Used for full-screen image and PDF viewing.
const MIN = 1
const MAX = 6

export default function PinchPanZoom({ children }) {
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 })
  const pointers = useRef(new Map())
  const pinch = useRef(null) // { dist, midX, midY }

  const clampScale = (s) => Math.min(MAX, Math.max(MIN, s))

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]

    if (pts.length === 1) {
      // Pan.
      setT((cur) => {
        if (cur.scale === 1) return cur
        return { ...cur, x: cur.x + (e.clientX - prev.x), y: cur.y + (e.clientY - prev.y) }
      })
    } else if (pts.length === 2) {
      const [a, b] = pts
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      if (pinch.current) {
        const ratio = dist / pinch.current.dist
        setT((cur) => {
          const scale = clampScale(cur.scale * ratio)
          return { scale, x: cur.x + (midX - pinch.current.midX), y: cur.y + (midY - pinch.current.midY) }
        })
      }
      pinch.current = { dist, midX, midY }
    }
  }, [])

  const onPointerUp = useCallback((e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    setT((cur) => ({ ...cur, scale: clampScale(cur.scale * (e.deltaY < 0 ? 1.1 : 0.9)) }))
  }, [])

  const reset = () => setT({ scale: 1, x: 0, y: 0 })
  const onDoubleClick = () => setT((cur) => (cur.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }))
  const zoomBy = (f) => setT((cur) => ({ ...cur, scale: clampScale(cur.scale * f) }))

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="h-full w-full touch-none select-none overflow-hidden"
        style={{ cursor: t.scale > 1 ? 'grab' : 'auto' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
            transformOrigin: 'center center',
            transition: pointers.current.size ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {children}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
        <button onClick={() => zoomBy(0.8)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white" aria-label="Zoom out">−</button>
        <button onClick={reset} className="flex h-9 items-center justify-center rounded-full px-3 text-sm text-white" aria-label="Reset zoom">{Math.round(t.scale * 100)}%</button>
        <button onClick={() => zoomBy(1.25)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white" aria-label="Zoom in">+</button>
      </div>
    </div>
  )
}
