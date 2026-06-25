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
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
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
    'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50'

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/trips"
            aria-label="Back to trips"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
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
                    ? 'bg-sky-600 text-white ring-sky-600'
                    : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Home currency">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
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
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Trip Vault is installed on this device. ✓
            </p>
          ) : installable ? (
            <button
              onClick={async () => {
                await promptInstall()
                setInstallable(canInstall())
              }}
              className="min-h-[44px] rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
            >
              Add to home screen
            </button>
          ) : isIOS() ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              In Safari, tap the <span className="font-medium">Share</span> button, then{' '}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Use your browser’s menu and choose <span className="font-medium">Install</span> /{' '}
              <span className="font-medium">Add to Home Screen</span>. (If it’s not offered, the app
              may already be installed.)
            </p>
          )}
        </Card>

        <Card title="Offline storage">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Saved files cached for offline use:{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {cache == null ? '…' : formatBytes(cache)}
            </span>
          </p>
        </Card>
      </main>
    </div>
  )
}
