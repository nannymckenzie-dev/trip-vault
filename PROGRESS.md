# Trip Vault — Build Progress

Working handoff doc. Spec: `nanny_trip_vault_PRD.md`. Last updated: **2026-06-24 (night)**.

## ⏭️ NEXT ACTION

**Phases 1–5 are DONE and deployed.** Phase 4 (Gmail import) and Phase 5 (AeroAPI flight
status) both verified end-to-end against the live site. **Prod domain:
`https://trip-vault-nanny.vercel.app`** (Vercel scope `m6andco`, account `nannymckenzie-dev`;
all env vars set in prod + preview + `.env.local`).

**Next: Phase 6 — read-only share links.** Per PRD §Sharing / §Phase 6:
- Share token generation + a share-settings modal (toggle which sections are exposed:
  docs / tickets / budget).
- Public `/share/:token` route that renders without auth (read-only).
- Revoke share. Remember PRD principle #5: documents stay private — only expose what the
  toggle allows, via signed URLs, never permanent public URLs.

**Standing reminders:**
- **Rotate** these secrets — all pasted into a chat transcript: Anthropic key, Google client
  secret, AeroAPI key. (Update in Vercel via `vercel env rm` + `add`, then redeploy.)
- Minor: stored `gmail_address` is null (cosmetic; `getTokenInfo` display lookup failed
  non-fatally — scanning works off the refresh token).

## Phase 7 — built (2026-06-25)

Budget tracker (`/trips/:id/budget`) + currency calculator (`/trips/:id/currency`), both linked
from trip detail. No DB migration (`trip_budgets` / `budget_entries` already existed).
- `src/lib/currency.js` — offline-first rate cache (IndexedDB), free no-key source
  `open.er-api.com/v6/latest/USD`; converts any pair through USD. `src/lib/budget.js` —
  categories + section→category map.
- `src/pages/Budget.jsx` — set total + currency, expense CRUD, progress bar, per-category
  breakdown. Spent is summed in the budget currency via cached rates; entries in currencies
  with no saved rate are counted at face value and flagged "approximate".
- `src/pages/Currency.jsx` — From/To + amount, live result, swap, recent pairs (localStorage),
  "Rates as of …", Refresh (disabled offline), offline empty state. Smart default From = trip's
  most-common currency; To = USD (home currency hardcoded for now — make it a setting in Phase 8).
- "Add to budget" on cost-bearing cards (CardDetail) deep-links to the budget add form with
  amount/currency/category/description pre-filled via query params.

## Phase 5 — built & verified (2026-06-25)

`api/flights/status.js` (header-authed AeroAPI v4 call, key server-side only),
`src/lib/flightCache.js` (15-min IndexedDB cache), `src/components/FlightStatus.jsx`
("Check Status" on flight cards). AeroAPI only covers flights within ~2 days of departure:
far-out dates short-circuit (no query, no charge) with a friendly note; the query window is
anchored to the flight date ±1 day with `end` kept an hour under AeroAPI's +2-day limit
(landing exactly on it 400s). Setup in `docs/phase5-setup.md`.

## Status: Phases 1–5 done & deployed; Phase 6 & 7 built & deployed — pending browser verification

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite + React + Tailwind + PWA, Supabase auth, `/trips` grid, trip CRUD | ✅ Done |
| 2 | 5 card types, quick tags, trip overview panels, drag-to-reorder | ✅ Done |
| 3 | Storage buckets + RLS, document vault, ticket storage, pdf.js viewer, offline file cache | ✅ Done |
| 4 | Gmail OAuth + Claude email import + review queue | ✅ Done — configured, deployed, connect→scan→review verified end-to-end |
| 5 | AeroAPI flight status | ✅ Done — key set, deployed, live status verified with real flight data |
| 6 | Read-only share links (`/share/:token`) | 🟡 Built + deployed, API-verified — owner UI pending a browser check |
| 7 | Budget tracker + currency calculator | 🟡 Built + deployed — pending a browser check |
| 8 | Offline audit, install prompts, mobile polish, dark mode, empty/loading states | 🟡 In progress — dark mode + Settings + install + home-currency done; remaining: "last synced", empty/loading audit, offline audit |

## Live environment

- **Repo:** github.com/nannymckenzie-dev/trip-vault (branch `main`)
- **Supabase project ref:** `wfgqkajebqdmxoafqegm`
- **Deploy:** Vercel (auto-deploys on push to `main`). Requires `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` set in Vercel **before build** (else white screen — see below).
- **Login (single seeded user):** `nanny.mckenzie@gmail.com`

## Database

Applied to the live DB (both via Supabase Management API):
- `supabase/schema.sql` — all 13 tables + per-user owner-only RLS.
- `supabase/storage.sql` — private `documents` + `tickets` buckets, uid-prefix object policies.

If schema changes are needed later, re-run the relevant `.sql` in the Supabase SQL Editor
(or via a short Management-API script + a fresh `sbp_` token, then revoke it).

## Key conventions / things to remember

- **Card system is config-driven:** add a card field in `src/lib/cardTypes.js`, not in components.
- **Storage is private:** files are stored under `<user_id>/<trip_id>/<uuid>.<ext>`; access only via
  short-lived signed URLs (`src/lib/storage.js`). Never build public URLs for documents.
- **Offline files:** `src/lib/offlineFiles.js` (IndexedDB). Viewer reads cache first.
- **pdf.js** is lazy-loaded (`src/lib/pdf.js`) so it stays out of the main bundle.
- **Tailwind v4** — config lives in `src/index.css`, no `tailwind.config.js`.
- **Secrets:** anything secret must NOT have a `VITE_` prefix (Vite inlines `VITE_*` into the
  browser bundle). `.env.local` is gitignored.

## Deploy gotcha (already hit once)

A Vercel deploy shows a **blank white screen** if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
aren't set in Vercel — `src/lib/supabase.js` throws at load. Fix: set the vars, then redeploy
**without build cache** (the bad values get baked into the cached build otherwise).

## Open items

- [ ] **Complete the Phase 4 external setup** (see "NEXT ACTION" at top + `docs/phase4-setup.md`)
      and verify connect → scan → review before starting Phase 5.
- [ ] **Revoke the `sbp_` Supabase access token** at
      https://supabase.com/dashboard/account/tokens (used to apply storage SQL; not stored in repo
      or `.env.local`).
- [ ] Consider not eagerly precaching the ~420 kB pdf.js chunk in the service worker (Phase 8 polish).
- [ ] The seeded user's password appears in the build chat transcript — rotate via Supabase Auth if desired.

## Phase 4 — built (2026-06-24)

First server-side code. Vercel serverless functions under `/api`:
- `api/_lib/` — `supabaseAdmin.js` (service-role client + JWT `getUser`), `google.js`
  (OAuth2 client, HMAC-signed `state`, per-user Gmail client), `claudeParse.js`
  (`claude-sonnet-4-6`, JSON-envelope prompt, defensive parse).
- `api/gmail/` — `connect` (POST → consent URL), `callback` (stores refresh token),
  `status`, `scan` (label list → dedupe vs `imported_emails` → Claude parse → candidates),
  `attachment` (PDF bytes for the confirm step).
- Client: `src/lib/api.js` (authed fetch), `src/lib/emailImport.js` (type→table map +
  payload builder), `src/pages/Import.jsx` (review queue, reuses `Field` + `QuickTagPicker`).
  Route `/trips/:id/import`; linked from trip detail.
- `vercel.json` rewrite now excludes `/api/` (`/((?!api/).*)`).
- Model chosen: **`claude-sonnet-4-6`** (per PRD). PDF-attachment import included.

- Functions fail **legibly** when unconfigured: `getAdmin()` is lazy (no import-time crash),
  `getUser` throws coded errors, `failAuth` maps to 503/401, and `/api/gmail/status` returns
  `{ configured: false }` so the Import page shows a "not set up yet" card, not a 500.

**Status: deployed but inert** — waiting on the owner setup in "NEXT ACTION" above. No DB
migration (`gmail_connections` + `imported_emails` already exist). Run locally with
`vercel dev` (plain `npm run dev` / Vite does **not** serve `/api`).

## Next session — gate check, then Phase 5

1. **First:** confirm Phase 4 setup is done and the connect → scan → review flow works on the
   deployed site (or `vercel dev`). Debug any errors — they now return readable messages.
2. **Then:** Phase 5 — AeroAPI flight status (key config, "Check Status" on flight cards,
   15-min IndexedDB cache). See PRD §Card Types → Live flight status and §Notes on AeroAPI.
