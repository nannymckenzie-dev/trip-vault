import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Wordmark from '../components/Wordmark'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/trips'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in → skip the login screen.
  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-bg px-4 py-12">
      <div className="brand-grain" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Wordmark full size={44} />
          <p className="mt-4 text-sm text-text-soft">Sign in to your trip command center</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-card bg-surface p-6 shadow-[0_6px_18px_rgba(42,39,36,.10)] ring-1 ring-line"
        >
          <div>
            <label htmlFor="email" className="mb-1 block label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block label-caps text-[10px] text-text-dim" style={{ letterSpacing: '0.14em' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-lg bg-accent px-4 py-2.5 text-base font-bold text-on-accent transition hover:brightness-95 active:scale-[.98] disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
