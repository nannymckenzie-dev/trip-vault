// Captures the PWA install flow. `beforeinstallprompt` fires early, so this
// module registers its listener on import (imported from main.jsx at startup).
// iOS Safari doesn't fire it — the Settings page shows manual instructions there.

let deferred = null
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export function canInstall() {
  return deferred !== null
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function promptInstall() {
  if (!deferred) return false
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  if (outcome === 'accepted') deferred = null
  emit()
  return outcome === 'accepted'
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
