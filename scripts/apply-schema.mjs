// One-off: apply supabase/schema.sql to the project's database via the
// Supabase Management API (the only HTTP path that runs arbitrary SQL).
//
//   node scripts/apply-schema.mjs
//
// Requires a personal access token (https://supabase.com/dashboard/account/tokens):
//   SUPABASE_ACCESS_TOKEN=sbp_...   (in .env.local or the shell environment)
//
// The project ref is derived from VITE_SUPABASE_URL.

import { readFileSync } from 'node:fs'

function loadEnv() {
  const env = {}
  let raw
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  } catch {
    return env
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = { ...loadEnv(), ...process.env }
const token = env.SUPABASE_ACCESS_TOKEN
const url = env.VITE_SUPABASE_URL

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN. Create one at\n' +
      '  https://supabase.com/dashboard/account/tokens\n' +
      'and add it to .env.local as SUPABASE_ACCESS_TOKEN=sbp_...'
  )
  process.exit(1)
}
if (!url) {
  console.error('Missing VITE_SUPABASE_URL in .env.local.')
  process.exit(1)
}

// https://xxxx.supabase.co -> xxxx
const ref = new URL(url).hostname.split('.')[0]
const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')

console.log(`Applying supabase/schema.sql to project ${ref}…`)

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

const text = await res.text()
if (!res.ok) {
  console.error(`Failed (HTTP ${res.status}):`, text)
  process.exit(1)
}

console.log('Schema applied successfully.')
// The query endpoint returns the last statement's result set (usually []).
