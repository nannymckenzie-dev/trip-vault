# Trip Vault — Build Progress

Working handoff doc. Spec: `nanny_trip_vault_PRD.md`. Last updated: **2026-06-24 (evening)**.

## Status: Phases 1–3 complete, deployed, and verified

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite + React + Tailwind + PWA, Supabase auth, `/trips` grid, trip CRUD | ✅ Done |
| 2 | 5 card types, quick tags, trip overview panels, drag-to-reorder | ✅ Done |
| 3 | Storage buckets + RLS, document vault, ticket storage, pdf.js viewer, offline file cache | ✅ Done |
| 4 | Gmail OAuth + Claude email import + review queue | ⬜ Next |
| 5 | AeroAPI flight status | ⬜ |
| 6 | Read-only share links (`/share/:token`) | ⬜ |
| 7 | Budget tracker (`/trips/:id/budget`) | ⬜ |
| 8 | Offline audit, install prompts, mobile polish, dark mode, empty/loading states | ⬜ |

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

- [ ] **Revoke the `sbp_` Supabase access token** at
      https://supabase.com/dashboard/account/tokens (used to apply storage SQL; not stored in repo
      or `.env.local`).
- [ ] Consider not eagerly precaching the ~420 kB pdf.js chunk in the service worker (Phase 8 polish).
- [ ] The seeded user's password appears in the build chat transcript — rotate via Supabase Auth if desired.

## Next session — Phase 4 starting point

1. Decide serverless function layout for Vercel (`/api/*`) — first server-side code in the project.
2. Server-side secrets to add in Vercel (no `VITE_` prefix): `SUPABASE_SERVICE_ROLE_KEY`,
   `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
3. Build: Gmail OAuth (read-only `gmail.readonly`), label scan, Claude parse → review queue
   (no silent saves — user confirms each), `imported_emails` dedupe, PDF attachment → ticket storage.
4. Model note: PRD specifies `claude-sonnet-4-6`; latest available is `claude-opus-4-8`. Confirm choice.
