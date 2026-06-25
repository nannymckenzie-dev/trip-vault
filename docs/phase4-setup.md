# Phase 4 setup — Gmail import + Claude parsing

The email-import feature needs three external things wired up before it works.
None of this is in the repo; do it once per environment (local + Vercel).

## 1. Google Cloud — Gmail OAuth (read-only)

1. Create (or pick) a project at <https://console.cloud.google.com>.
2. **APIs & Services → Library → Gmail API → Enable.**
3. **OAuth consent screen:** User type *External*. Add your Google account under
   **Test users**. Add scope `https://www.googleapis.com/auth/gmail.readonly`.
   (While the app is in "Testing", refresh tokens expire ~7 days — fine for now;
   publish the app later for longevity.)
4. **Credentials → Create credentials → OAuth client ID → Web application.**
   Add **Authorized redirect URIs**:
   - Local: `http://localhost:3000/api/gmail/callback`
   - Prod:  `https://<your-app>/api/gmail/callback`
5. Copy the **Client ID** and **Client secret**.

## 2. Anthropic

Create an API key at <https://console.anthropic.com>. The parser uses
`claude-sonnet-4-6`.

## 3. Environment variables (no `VITE_` prefix — server-only)

Set these in **Vercel → Project → Settings → Environment Variables** (Production
+ Preview) and mirror them in `.env.local` for local `vercel dev`:

| Var | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `ANTHROPIC_API_KEY` | from step 2 |
| `GOOGLE_CLIENT_ID` | from step 1 |
| `GOOGLE_CLIENT_SECRET` | from step 1 |
| `GOOGLE_REDIRECT_URI` | the redirect URI for that environment (step 1.4) |
| `OAUTH_STATE_SECRET` | any long random string (`node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`) |

The functions also read the existing `VITE_SUPABASE_URL` and `VITE_APP_URL`
from the environment — make sure `VITE_APP_URL` is set (used to redirect back
into the app after OAuth).

## 4. Gmail label

In Gmail, create a label named **Trip Vault** and apply it to a couple of real
booking confirmation emails to test against.

## Running locally

The Vite dev server alone does **not** serve `/api`. Use:

```
vercel dev
```

which runs Vite + the serverless functions together on `http://localhost:3000`.
(Use that port in `GOOGLE_REDIRECT_URI` for local testing.)

## How it works

- `POST /api/gmail/connect` → returns the Google consent URL (header-authed).
- `/api/gmail/callback` → stores the refresh token in `gmail_connections`.
- `POST /api/gmail/scan` → lists `label:"Trip Vault"` emails not yet in
  `imported_emails`, sends each to Claude, returns review candidates (nothing is
  saved server-side).
- The review queue (`/trips/:id/import`) lets you edit and confirm each item;
  **Add** inserts via the browser Supabase client (RLS), pulls any PDF via
  `POST /api/gmail/attachment` into the `tickets`/`documents` bucket, and writes
  an `imported_emails` row so it won't be re-parsed. **Dismiss** just records the
  dismissal.

## Known follow-ups
- Refresh tokens are stored in `gmail_connections` protected by RLS + the
  service role, but not app-level encrypted (schema comment says "encrypted at
  rest"). Add encryption before any multi-user use.
