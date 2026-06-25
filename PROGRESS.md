# Trip Vault — Build Progress

Working handoff doc. Spec: `nanny_trip_vault_PRD.md`. Last updated: **2026-06-24 (night)**.

## ⏭️ NEXT ACTION

**Phase 4 is DONE** — Gmail import configured, deployed, and verified end-to-end (connect →
scan → review). **Prod domain: `https://trip-vault-nanny.vercel.app`** (Vercel scope
`m6andco`, account `nannymckenzie-dev`). The OAuth callback bug (PWA service worker
`navigateFallback` swallowing `/api/gmail/callback`) was fixed via
`navigateFallbackDenylist: [/^\/api\//]` in `vite.config.js`.

**Phase 5 (flight status) code is written** — needs the owner to set one env var:
1. Get an AeroAPI key + set `AEROAPI_KEY` in Vercel (prod + preview) and `.env.local`, then
   redeploy. Steps in `docs/phase5-setup.md` (free personal tier, 500 queries/mo, needs a card).
2. Verify: open a flight card with a flight number → **Check Status** → confirm live times.

**Standing reminders:**
- **Rotate** the Anthropic key + Google client secret (both pasted into a chat transcript).
- Minor: stored `gmail_address` is null (cosmetic; `getTokenInfo` display lookup failed
  non-fatally — scanning works off the refresh token).

## Status: Phases 1–3 complete + deployed; Phase 4 code complete — BLOCKED on owner setup above

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite + React + Tailwind + PWA, Supabase auth, `/trips` grid, trip CRUD | ✅ Done |
| 2 | 5 card types, quick tags, trip overview panels, drag-to-reorder | ✅ Done |
| 3 | Storage buckets + RLS, document vault, ticket storage, pdf.js viewer, offline file cache | ✅ Done |
| 4 | Gmail OAuth + Claude email import + review queue | ✅ Done — configured, deployed, connect→scan→review verified end-to-end |
| 5 | AeroAPI flight status | 🟡 Code done — needs `AEROAPI_KEY` (`docs/phase5-setup.md`) |
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
