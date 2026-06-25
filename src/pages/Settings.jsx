import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTheme, setTheme } from '../lib/theme'
import { getHomeCurrency, setHomeCurrency } from '../lib/prefs'
import { currencyList, getCachedRates } from '../lib/currency'
import { canInstall, subscribe, promptInstall, isStandalone, isIOS } from '../lib/install'
import { cacheSizeBytes } from '../lib/offlineFiles'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function formatBytes(n) {
  if (!n) return '0 MB'
  const mb = n / (1024 * 1024)
  return mb < 0.1 ? `${Math.round(n / 1024)} KB` : `${mb.toFixed(1)} MB`
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 className="mb-3 text-sm font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

export default function Settings() {
  const [theme, setThemeState] = useState(getTheme())
  const [home, setHome] = useState(getHomeCurrency())
  const [currencies, setCurrencies] = useState(currencyList(null))
  const [installable, setInstallable] = useState(canInstall())
  const [cache, setCache] = useState(null)

  useEffect(() => {
    getCachedRates().then((c) => c && setCurrencies(currencyList(c.rates)))
    cacheSizeBytes().then(setCache).catch(() => setCache(0))
    return subscribe(() => setInstallable(canInstall()))
  }, [])

  function chooseTheme(v) {
    setThemeState(v)
    setTheme(v)
  }
  function chooseHome(v) {
    setHome(v)
    setHomeCurrency(v)
  }

  const selectCls =
    'w-full min-h-[44px] rounded-lg border border-line bg-surface px-3 text-base text-text outline-none focus:border-accent'

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/trips"
            aria-label="Back to trips"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-text-dim hover:text-text"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-text">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <Card title="Appearance">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => chooseTheme(t.value)}
                className={`min-h-[44px] rounded-lg text-sm font-medium ring-1 transition ${
                  theme === t.value
                    ? 'bg-accent text-on-accent ring-accent'
                    : 'bg-surface text-text-soft ring-line hover:bg-bg'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Home currency">
          <p className="mb-2 text-xs text-text-dim">
            Used as the default “To” in the currency calculator.
          </p>
          <select value={home} onChange={(e) => chooseHome(e.target.value)} className={selectCls}>
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Card>

        <Card title="Install app">
          {isStandalone() ? (
            <p className="text-sm text-sage">
              Trip Vault is installed on this device. ✓
            </p>
          ) : installable ? (
            <button
              onClick={async () => {
                await promptInstall()
                setInstallable(canInstall())
              }}
              className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:brightness-95"
            >
              Add to home screen
            </button>
          ) : isIOS() ? (
            <p className="text-sm text-text-soft">
              In Safari, tap the <span className="font-medium">Share</span> button, then{' '}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-sm text-text-soft">
              Use your browser’s menu and choose <span className="font-medium">Install</span> /{' '}
              <span className="font-medium">Add to Home Screen</span>. (If it’s not offered, the app
              may already be installed.)
            </p>
          )}
        </Card>

        <Card title="Offline storage">
          <p className="text-sm text-text-soft">
            Saved files cached for offline use:{' '}
            <span className="font-medium text-text">
              {cache == null ? '…' : formatBytes(cache)}
            </span>
          </p>
        </Card>
      </main>
    </div>
  )
}
