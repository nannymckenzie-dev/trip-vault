import { useEffect, useState } from 'react'
import { timeAgo } from '../lib/datetime'

// Trip-header freshness line. Shows when the trip data was last loaded while
// online; when offline, makes clear the screen is showing saved data.
export default function SyncStatus({ syncedAt }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [, setTick] = useState(0)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    const id = setInterval(() => setTick((t) => t + 1), 30000) // keep "Xm ago" fresh
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      clearInterval(id)
    }
  }, [])

  if (!online) {
    return <span className="text-accent-strong">Offline · showing saved data</span>
  }
  if (!syncedAt) return null
  return <span className="text-text-dim">Synced {timeAgo(syncedAt)}</span>
}
