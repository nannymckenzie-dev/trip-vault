// Theme manager. The `dark:` variant is class-based (.dark on <html>), so this
// is what actually turns dark mode on. Three modes: 'light' | 'dark' | 'system'.

const KEY = 'tripvault.theme'

export function getTheme() {
  return localStorage.getItem(KEY) || 'system'
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolvedTheme(theme = getTheme()) {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

export function applyTheme(theme = getTheme()) {
  document.documentElement.classList.toggle('dark', resolvedTheme(theme) === 'dark')
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

// Call once at startup (before render avoids a flash). Also keeps 'system' mode
// in sync when the OS theme changes while the app is open.
export function initTheme() {
  applyTheme()
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') applyTheme('system')
    })
}
