# Trip Vault — Product Requirements Document
### For Claude Code | Version 1.0

---

## Overview

**App name:** Trip Vault (working title — can be changed)
**Owner:** Single user (Nanny), with read-only sharing capability
**Purpose:** A personal trip command center. Nanny already plans her trips — she needs a
secure, organized, offline-capable place to store everything and pull it up on her phone
without digging through emails, PDFs, and browser tabs.

**What this is NOT:** A travel planner, a discovery tool, a social app. No AI suggestions,
no recommended restaurants, no map-based planning. The app organizes what she already has.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa (Workbox) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres |
| File storage | Supabase Storage |
| Offline cache | IndexedDB via Workbox |
| Flight status | FlightAware AeroAPI (personal free tier) |
| Email parsing | Anthropic Claude API (claude-sonnet-4-6) |
| Gmail integration | Google Gmail API (OAuth 2.0) |
| Deployment | Vercel |

---

## Authentication

- Email/password login via Supabase Auth
- Single user app — no registration flow needed, just seed one account
- All routes protected behind auth
- Supabase RLS (Row Level Security) on all tables — data is user-scoped
- Session persists across browser restarts (Supabase handles this)
- On mobile PWA, session should survive app close

---

## App Structure & Routes

```
/                    → Redirect to /trips if logged in, /login if not
/login               → Login screen
/trips               → Home: grid of all trips (this is the home screen, nothing else)
/trips/new           → Create new trip
/trips/:id           → Trip overview page
/trips/:id/flights/:fid     → Flight detail card
/trips/:id/hotels/:hid      → Hotel detail card
/trips/:id/activities/:aid  → Activity detail card
/trips/:id/restaurants/:rid → Restaurant detail card
/trips/:id/transport/:tid   → Ground transport detail card
/trips/:id/documents        → Document vault
/trips/:id/tickets          → Ticket storage
/trips/:id/budget           → Budget tracker
/trips/:id/import           → Email import screen
/share/:token               → Read-only shared trip view (no auth required)
```

---

## Home Screen: /trips

- Grid of trip cards (2 columns on mobile, 3 on desktop)
- Each card shows: trip name, destination, date range, cover photo (optional), and a
  colored status badge: UPCOMING / IN PROGRESS / PAST
- "New Trip" button prominently at top
- NO social content, NO suggestions, NO discovery feed
- Sort: upcoming trips first, then past trips newest-to-oldest

---

## Trip Overview: /trips/:id

The main hub for a single trip. Sections displayed as a vertical list of collapsible panels:

1. **Flights** — list of flight cards
2. **Hotels** — list of hotel cards
3. **Activities** — list of activity cards
4. **Restaurants** — list of restaurant reservation cards
5. **Ground Transport** — rental cars, trains, transfers
6. **Tickets** — stored PDFs (museum tickets, show tickets, etc.)
7. **Documents** — passport, visa, insurance vault
8. **Budget** — spending tracker
9. **Notes** — trip-level free text notepad

Each section has an "+ Add" button and shows a summary count ("3 flights").

A sticky top bar shows: trip name, date range, and a "Share" button.

---

## Card Types & Fields

### Flight Card

| Field | Type | Notes |
|---|---|---|
| Airline | text | |
| Flight number | text | e.g. DL447 |
| Confirmation code | text | Displayed prominently |
| Departure airport | text | IATA code + city name |
| Departure date/time | datetime | |
| Arrival airport | text | IATA code + city name |
| Arrival date/time | datetime | |
| Terminal (depart) | text | optional |
| Gate (depart) | text | optional |
| Terminal (arrive) | text | optional |
| Seat assignment | text | optional |
| Baggage allowance | text | optional |
| Ticket class | text | optional (Economy, Business, etc.) |
| Live status | auto | Pulled from AeroAPI on demand (see below) |
| Quick tags | multi-select | See Quick Tags section |
| Notes | textarea | Free text |

**Live flight status:** A "Check Status" button on the flight card triggers an AeroAPI
call using the flight number and date. Displays: scheduled vs. actual times, delay info,
gate if available, status (On Time / Delayed / Landed / Cancelled). Results are cached
for 15 minutes in IndexedDB. Does not auto-refresh — user taps to check.

### Hotel Card

| Field | Type | Notes |
|---|---|---|
| Hotel name | text | |
| Confirmation number | text | Displayed prominently |
| Check-in date | date | |
| Check-out date | date | |
| Check-in time | time | optional |
| Check-out time | time | optional |
| Address | text | |
| Phone number | text | |
| Room type | text | optional |
| Rate per night | number + currency | optional |
| Cancellation policy | text | optional |
| What's included | text | e.g. "Breakfast daily, free parking" |
| Quick tags | multi-select | |
| Notes | textarea | |

### Activity Card

| Field | Type | Notes |
|---|---|---|
| Activity name | text | |
| Date | date | |
| Time | time | optional |
| Duration | text | optional |
| Confirmation number | text | optional |
| Meeting point / address | text | optional |
| Operator / company | text | optional |
| Cost | number + currency | optional |
| What's included | text | optional |
| Cancellation policy | text | optional |
| Quick tags | multi-select | |
| Notes | textarea | |

### Restaurant Card

| Field | Type | Notes |
|---|---|---|
| Restaurant name | text | |
| Date | date | |
| Time | time | |
| Party size | number | optional |
| Confirmation number | text | optional |
| Address | text | optional |
| Phone | text | optional |
| Quick tags | multi-select | |
| Notes | textarea | |

### Ground Transport Card

| Field | Type | Notes |
|---|---|---|
| Type | select | Rental car / Train / Bus / Transfer / Ferry / Other |
| Company / operator | text | |
| Confirmation number | text | |
| Pickup date/time | datetime | |
| Pickup location | text | |
| Dropoff date/time | datetime | optional |
| Dropoff location | text | optional |
| Vehicle / class | text | optional (rental car) |
| Cost | number + currency | optional |
| Quick tags | multi-select | |
| Notes | textarea | |

---

## Quick Tags System

Pre-built one-tap tags that display as colored badges on the card face (visible in list
view without opening the card). User can select multiple.

**Tag list:**
- `Prepaid` (green)
- `Breakfast included` (teal)
- `Free cancellation` (blue)
- `Requires ID` (orange)
- `Need to print` (yellow)
- `Pick up on arrival` (purple)
- `Deposit required` (red)
- `Dress code` (gray)
- `Flexible dates` (light blue)

Tags show as small pill badges on each card in the list. Tap a tag on the card detail
to toggle it on/off.

---

## Document Vault: /trips/:id/documents

Secure storage for sensitive travel documents. All files stored in Supabase Storage
with per-user access control.

### Document types (pre-defined sections):

1. **Passports** — photo/scan per traveler
2. **Visas** — photo/scan per country
3. **Travel Insurance** — policy PDF or photo, plus key fields:
   - Policy number
   - Provider name
   - Emergency contact number (displayed prominently)
   - Coverage dates
4. **Other Documents** — labeled free-form uploads

### For each document:
- Upload from file (desktop or mobile)
- Capture from camera (mobile — uses device camera via `<input capture="environment">`)
- Label / traveler name
- Notes field
- Full-screen viewer with pinch-to-zoom

### Offline behavior:
- Documents are cached to IndexedDB on first view
- "Download for offline" button on each document caches it explicitly
- Cached indicator shows which docs are available offline

---

## Ticket Storage: /trips/:id/tickets

For pre-purchased tickets that don't live in an app (museum tickets, theater, tours,
events, etc.)

### Per ticket:
- Name / label (e.g. "Uffizi Gallery — Sept 14")
- Date of use
- PDF or image upload
- In-app PDF viewer (fullscreen, pinch-to-zoom, offline-capable)
- Notes field
- Quick tags

### Behavior:
- PDFs render inline using pdf.js (embed in-app, no external app opens)
- All uploaded tickets are cached offline automatically after first load
- Tickets are NOT in the document vault — they're a separate section

---

## Email Import: /trips/:id/import

This is how Nanny populates her trip data without manual entry.

### Gmail Label-Based Scanning (primary method)

**One-time setup:**
1. User connects Gmail via OAuth (Google sign-in, read-only Gmail scope)
2. User creates a Gmail label (suggested: "Trip Vault") — instructions shown in app
3. Done. From now on she applies that label to any confirmation email.

**Import flow:**
1. She opens /trips/:id/import and taps "Scan Gmail for new emails"
2. App queries Gmail API for emails with the "Trip Vault" label that haven't been
   imported yet (tracked by message ID in a `imported_emails` table)
3. For each unprocessed email, the app sends the cleaned email body to Claude API
4. Claude returns structured JSON identifying the type and populating all fields
5. App shows a **Review Queue**: each parsed result as a preview card
6. User reviews each one, edits any incorrect fields, then taps "Add to Trip"
7. Confirmed items are saved to the database; the email message ID is recorded as imported

**Claude parsing prompt (system prompt sent with each email):**

```
You are a travel confirmation email parser. Extract structured data from the
following email and return ONLY valid JSON with no other text.

Identify the type from: flight, hotel, activity, restaurant, ground_transport, ticket,
travel_insurance, or unknown.

Return this structure:
{
  "type": "flight",
  "confidence": 0.95,
  "data": {
    // All relevant fields for that type — see field definitions
    // Use null for any field not found in the email
    // Dates as ISO 8601 strings
    // Currency as ISO 4217 codes
  },
  "has_pdf_attachment": true/false,
  "notes_suggestion": "Any important info that didn't fit structured fields"
}

If the email contains multiple bookings (e.g., outbound and return flight in one email),
return an array of objects.

If type is unknown or unrecognizable, return { "type": "unknown" }.
```

**PDF attachment handling:**
If Claude flags `has_pdf_attachment: true`, the import screen offers to pull the
attachment and add it to ticket storage automatically.

### Manual Entry (always available)
Every section has an "+ Add manually" button. No email required.

---

## Sharing: Read-Only Trip View

### How it works:
1. From the trip overview, tap "Share"
2. Choose what to include: toggle on/off — Documents, Tickets, Budget
3. Documents are OFF by default (passport photos should not be shared by accident)
4. App generates a unique token and a shareable URL: `/share/[token]`
5. Token stored in DB with trip ID, expiry (optional), and inclusion settings

### Shared view:
- Public URL, no login required
- Shows trip name, dates, all included sections in read-only mode
- PDF tickets viewable in-browser
- Can be revoked at any time by the trip owner
- Optional expiry date (e.g., "expires 2 weeks after trip end")

### What shared viewers can do:
- View all non-excluded content
- View and zoom PDFs and document photos
- Copy confirmation numbers

### What shared viewers cannot do:
- Edit anything
- See excluded sections
- Access any other trips

---

## Budget Tracker: /trips/:id/budget

Simple, not complex.

### Setup:
- Set a total trip budget with currency
- Optional: set sub-budgets by category

### Categories:
- Flights
- Hotels
- Food & Dining
- Activities & Tours
- Transport
- Shopping
- Other

### Per expense entry:
- Amount + currency
- Category
- Description
- Date
- Paid by (free text field — useful if traveling with others)
- Notes

### Summary view:
- Total spent vs. total budget (progress bar)
- Breakdown by category
- Running list of all entries

### Auto-population:
When a card is added (hotel, activity, etc.) with a cost field, the app offers to
"Add to budget" — one tap, pre-populated with the amount and category guessed from type.

---

## Offline Strategy

This app must work offline. She will use it in foreign countries without data.

### PWA setup:
- `vite-plugin-pwa` with Workbox
- App shell (all JS, CSS, fonts) cached on install
- Service worker handles fetch — cache-first for static assets, network-first with
  cache fallback for API data

### Data caching:
- On trip load, all trip data (flights, hotels, etc.) written to IndexedDB
- All Supabase responses cached in IndexedDB with timestamp
- "Last synced: [time]" indicator in the trip header
- When offline, app reads from IndexedDB transparently — no error state, just works

### File caching:
- PDFs and images are NOT automatically cached (storage concerns)
- Each document/ticket has a "Save offline" button — tapping it fetches and stores
  the file as a blob in IndexedDB
- Green checkmark indicator on cached items
- Cache size estimate shown in settings

### AeroAPI flight status:
- Only works online (live data by definition)
- When offline, shows last fetched status with timestamp
- "Check Status" button disabled with "No internet connection" message when offline

### Email import:
- Only works online
- Clear messaging if user tries to import while offline

---

## Mobile UX Requirements

The mobile experience is primary. Desktop is for data entry convenience.

- Install prompt: show "Add to Home Screen" instructions on first visit on mobile
- Bottom navigation bar on mobile: Trips / (active trip sections) / Settings
- All tap targets minimum 44x44px
- Swipe to go back on card detail views
- Camera capture for document uploads uses `<input type="file" accept="image/*" capture="environment">`
- PDF viewer uses pdf.js rendered to canvas — no relying on browser PDF handling
- All modals are full-screen on mobile
- Text is minimum 16px to prevent iOS auto-zoom on inputs
- Dark mode supported (system preference via `prefers-color-scheme`)

---

## Data Model (Supabase / Postgres)

```sql
-- All tables include user_id for RLS

trips (
  id uuid primary key,
  user_id uuid references auth.users,
  name text,
  destination text,
  start_date date,
  end_date date,
  cover_photo_url text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)

flights (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  airline text,
  flight_number text,
  confirmation_code text,
  depart_airport text,
  depart_datetime timestamptz,
  depart_terminal text,
  depart_gate text,
  arrive_airport text,
  arrive_datetime timestamptz,
  arrive_terminal text,
  seat text,
  baggage text,
  ticket_class text,
  quick_tags text[],
  notes text,
  last_status_check timestamptz,
  last_status_data jsonb,
  sort_order int
)

hotels (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  name text,
  confirmation_number text,
  checkin_date date,
  checkout_date date,
  checkin_time time,
  checkout_time time,
  address text,
  phone text,
  room_type text,
  rate_per_night numeric,
  currency char(3),
  cancellation_policy text,
  whats_included text,
  quick_tags text[],
  notes text,
  sort_order int
)

activities (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  name text,
  activity_date date,
  activity_time time,
  duration text,
  confirmation_number text,
  address text,
  operator text,
  cost numeric,
  currency char(3),
  whats_included text,
  cancellation_policy text,
  quick_tags text[],
  notes text,
  sort_order int
)

restaurants (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  name text,
  reservation_date date,
  reservation_time time,
  party_size int,
  confirmation_number text,
  address text,
  phone text,
  quick_tags text[],
  notes text,
  sort_order int
)

ground_transport (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  transport_type text,
  company text,
  confirmation_number text,
  pickup_datetime timestamptz,
  pickup_location text,
  dropoff_datetime timestamptz,
  dropoff_location text,
  vehicle_class text,
  cost numeric,
  currency char(3),
  quick_tags text[],
  notes text,
  sort_order int
)

documents (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  doc_type text,  -- passport, visa, insurance, other
  label text,
  file_url text,
  file_type text,  -- image/jpeg, image/png, application/pdf
  policy_number text,  -- insurance only
  provider text,  -- insurance only
  emergency_contact text,  -- insurance only
  coverage_start date,  -- insurance only
  coverage_end date,  -- insurance only
  notes text,
  sort_order int
)

tickets (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  name text,
  use_date date,
  file_url text,
  file_type text,
  quick_tags text[],
  notes text,
  sort_order int
)

budget_entries (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  amount numeric,
  currency char(3),
  category text,
  description text,
  entry_date date,
  paid_by text,
  notes text
)

trip_budgets (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  total_budget numeric,
  currency char(3),
  category_budgets jsonb  -- { "flights": 2000, "hotels": 1500, ... }
)

share_tokens (
  id uuid primary key,
  trip_id uuid references trips,
  user_id uuid,
  token text unique,
  include_documents boolean default false,
  include_tickets boolean default true,
  include_budget boolean default false,
  expires_at timestamptz,
  created_at timestamptz
)

imported_emails (
  id uuid primary key,
  user_id uuid,
  trip_id uuid references trips,
  gmail_message_id text unique,
  imported_at timestamptz,
  parse_result jsonb
)

gmail_connections (
  id uuid primary key,
  user_id uuid unique,
  gmail_address text,
  access_token text,  -- encrypted at rest
  refresh_token text,  -- encrypted at rest
  token_expiry timestamptz,
  import_label text default 'Trip Vault'
)
```

---

## Environment Variables

```
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # server-side only

# Anthropic (Claude API — for email parsing)
ANTHROPIC_API_KEY=

# AeroAPI (FlightAware — for flight status)
AEROAPI_KEY=

# Google OAuth (Gmail integration)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App
VITE_APP_URL=  # used for share link generation
```

---

## Build Phases

### Phase 1: Foundation (build this first)
- Vite + React + Tailwind scaffold
- Supabase project setup with all tables and RLS policies
- Auth flow (login, session persistence, protected routes)
- PWA setup with vite-plugin-pwa and Workbox
- Home screen: /trips grid
- Trip CRUD (create, edit, delete)
- Service worker basics

### Phase 2: Core Cards
- Flight card (all fields, add/edit/delete)
- Hotel card (all fields)
- Activity card (all fields)
- Restaurant card (all fields)
- Ground transport card (all fields)
- Quick tags system across all card types
- Trip overview page with all section panels
- Sort order drag-to-reorder on each section

### Phase 3: Files & Documents
- Supabase Storage bucket setup with per-user policies
- Document vault (upload, camera capture, full-screen viewer)
- Ticket storage (PDF upload, pdf.js inline viewer)
- "Save offline" caching for files to IndexedDB
- Offline indicators on cached items

### Phase 4: Email Import
- Gmail OAuth flow and token storage
- Gmail API label scanning
- Claude API integration for email parsing
- Review queue UI (preview each parsed result, edit fields, confirm)
- PDF attachment detection and routing to ticket storage
- imported_emails deduplication tracking

### Phase 5: Flight Status
- AeroAPI integration (key configuration, API calls)
- "Check Status" button on flight cards
- Status display (on time / delayed / landed / cancelled + actual times)
- 15-minute cache in IndexedDB

### Phase 6: Sharing
- Share token generation
- Share settings modal (toggle docs/tickets/budget)
- Public /share/:token route (no auth)
- Revoke share functionality

### Phase 7: Budget
- Budget setup (total + category budgets)
- Expense entry (add/edit/delete)
- Summary view with progress bars
- "Add to budget" shortcut from card cost fields

### Phase 8: Polish
- Full offline audit — every screen tested without network
- Install to home screen prompts and instructions
- "Last synced" indicator in trip header
- Mobile UX pass (tap targets, swipe navigation, text size)
- Dark mode
- Empty states for all sections
- Loading states and error handling throughout

---

## Key Design Principles for Claude Code

1. **Mobile first.** Every screen designed at 390px wide first, then scaled up.
2. **Offline always works.** If a screen breaks without internet, fix it before moving on.
3. **Her data, her control.** Nothing auto-saves silently to the trip without her
   reviewing it first (email imports show a review queue, not a silent save).
4. **Confirmation numbers front and center.** On every card that has one, the
   confirmation number should be the most prominent piece of text — large, easy to copy.
5. **Documents are sensitive.** Supabase Storage bucket for documents must be private.
   All file URLs must be signed (time-limited) — never expose permanent public URLs
   for passport photos or insurance docs.
6. **No feature creep.** Do not add map views, restaurant discovery, AI suggestions,
   or social features. The scope is exactly what's in this document.

---

## Notes on AeroAPI Setup

AeroAPI personal/non-commercial use is free (500 queries/month). Setup steps:
1. Register at flightaware.com/aeroapi
2. Select the free personal tier
3. Add a credit card (required but not charged under free tier)
4. Copy the API key to AEROAPI_KEY

Relevant endpoint: `GET /flights/{ident}` where ident is the flight number (e.g. DL447).
Filter by `start` and `end` params (date of travel ± 1 day) to get the right flight.

---

## Notes on Gmail OAuth Setup

Required OAuth scope: `https://www.googleapis.com/auth/gmail.readonly`

This scope is read-only — the app can never send, delete, or modify emails. This should
be communicated clearly to the user during the OAuth consent screen.

The Gmail API label query uses:
`q: "label:Trip Vault"` (or whatever label name the user sets)

Store refresh tokens encrypted in the `gmail_connections` table. Use the refresh token
to get new access tokens server-side — never expose the refresh token to the client.

---

*Document version 1.0 — built for Claude Code*
*App: Trip Vault | Owner: Nanny McKenzie*
