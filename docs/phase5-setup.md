# Phase 5 setup — AeroAPI flight status

Live flight status uses **FlightAware AeroAPI** (v4). The code is inert until one
env var is set, exactly like Phase 4.

## 1. Get an AeroAPI key

1. Register at <https://flightaware.com/aeroapi>.
2. Choose the **Personal** tier — free for non-commercial use, **500 queries/month**.
3. Add a credit card (required to activate, but the personal tier isn't charged
   as long as you stay under the free allotment — consider setting a usage alert).
4. Copy the **API key**.

## 2. Set the env var (server-side only — no `VITE_` prefix)

| Var | Value |
|---|---|
| `AEROAPI_KEY` | from step 1 |

- **Vercel** → Project → Settings → Environment Variables (Production + Preview),
  then **redeploy** (env changes only apply on a new build).
- **Local** → add it to `.env.local` for `vercel dev`.

## How it works

- `POST /api/flights/status` (header-authed) takes `{ flight_number, date }`,
  calls AeroAPI `GET /flights/{ident}` over a date-of-travel ± 1 day window, picks
  the flight whose scheduled departure is closest to the card's date, and returns
  a trimmed status object. The key never reaches the browser.
- The flight **CardDetail** view shows a "Check Status" button (only when the card
  has a flight number). Results are cached **15 minutes** in IndexedDB
  (`src/lib/flightCache.js`) and do **not** auto-refresh — the user taps to check.
- **Offline:** the button is disabled with a "No internet connection" note and the
  last fetched status is still shown with its timestamp (PRD offline strategy).

## Budget note

Each non-cached "Check Status" / "Refresh" tap is one AeroAPI query. The 15-minute
cache means repeated views of the same flight don't re-spend the quota. 500/month
is plenty for personal trip use.
