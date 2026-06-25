# Trip Vault — Design Brief (for Claude Design)

A handoff brief to redesign the Trip Vault UI around the **m⁶&co** brand
aesthetic. Top section is a paste-ready prompt; the rest is supporting detail.

---

## ⚡ Paste-ready prompt

> Redesign the UI of **Trip Vault**, a mobile-first personal travel-organizer PWA
> (React + Tailwind v4), around a **modern-farmhouse brand** drawn from our family
> logo: **m⁶&co — "Sarcasm, Sass & Class," Established 2003**. The logo is
> hand-painted distressed charcoal lettering on a cream sign, mounted on
> multi-tone reclaimed wood, with a thin vintage label border (broken at the
> corners) and a double-headed arrow motif.
>
> Capture that feeling — **warm, rustic, heritage, a little cheeky, but clean and
> legible** — in a cohesive design system: color tokens (light + dark), type
> scale, spacing/radius, and refreshed components. Translate the *texture* of the
> sign into restrained digital treatments (a subtle paper/linen surface, a
> distressed display face reserved for headers/wordmark, the label-border frame
> and double-arrow as accents) — **never at the expense of readability or touch
> usability.** It must stay a fast, one-handed utility app, not a marketing page.
>
> Deliver: a token set (CSS variables / Tailwind theme), a wordmark + app-icon
> refresh, and mockups of the key screens (trips grid, trip detail, a card detail,
> the public read-only share page, and an empty state). Keep all existing
> structure and flows; this is a visual reskin, not a re-architecture.

---

## 1. What Trip Vault is

A single-user, **mobile-first PWA** that organizes one family's trips: flights,
hotels, activities, restaurants, ground transport, plus a document/ticket vault,
a budget tracker, a currency calculator, and **public read-only share links** for
an itinerary. It must work **offline** (used abroad with no signal). Primary
surface is a phone at ~390px wide; desktop is secondary.

**It is a utility, not a brochure.** Confirmation numbers, times, and "what's my
gate" must be glanceable. Brand flavor lives in the chrome (headers, wordmark,
empty states, the share page), not in the way of the data.

## 2. The inspiration (from the logo photo)

- **Hand-painted, distressed charcoal** lettering — imperfect, textured, heritage.
- **Cream/linen sign** with a **thin rectangular border that breaks at the corners**
  (old enamel-sign / branding-iron feel).
- Mounted on **reclaimed wood** in many stains — honey pine, walnut, espresso,
  weathered grey — warm and tactile.
- **Vintage cues:** "ESTABLISHED 2003," spaced uppercase labels.
- A **double-headed arrow** motif (fits a *travel* app beautifully — use it as a
  section divider / "in transit" marker).
- Voice: **"Sarcasm, Sass & Class"** — dry wit with polish.

## 3. Brand personality & voice

Warm · heritage · hand-made · witty · unfussy. Microcopy can have a dry, classy
sass (especially empty states and confirmations) — but instructions and data
labels stay plain and clear. Think "well-made farmhouse sign," not "rustic
clutter." When in doubt, **class wins over sass**.

## 4. Color palette (approximated from the photo — tune as needed)

| Role | Name | Hex (approx) |
|---|---|---|
| Ink / primary text | Charcoal | `#2A2724` |
| Softer ink | Worn Charcoal | `#4A453F` |
| Primary surface | Linen / Cream | `#F2EDE3` |
| Raised surface | Off-white Sign | `#FBF8F1` |
| Warm accent | Honey Pine | `#C79A5B` |
| Secondary accent | Walnut | `#8A5A33` |
| Deep accent | Espresso | `#3E2C1E` |
| Muted cool | Weathered Sage | `#6E7A6A` |
| Hairlines / borders | Driftwood | `#D8CFC0` |

- **Light mode:** Linen/cream surfaces, charcoal ink, honey/walnut for primary
  actions and accents, sage as a calm secondary. Wood tones as *accents and
  texture*, not large flat fills.
- **Dark mode:** invert to a warm near-black (espresso-tinted, e.g. `#1C1814`),
  cream text, honey as the accent. Keep it warm — avoid cold slate-blue. (The app
  currently uses cool slate; the reskin should warm it up.)
- **Accessibility:** body text ≥ 4.5:1 contrast; honey/walnut buttons need a dark
  enough shade (or charcoal text on honey) to pass. Test both modes.

## 5. Typography

- **Wordmark / hero:** a **distressed or characterful display** face echoing the
  hand-painted sign (e.g. a rough/letterpress serif or a confident geometric with
  a subtle texture), used sparingly — app title, share-page header, big empty
  states. Recreate the lowercase **m⁶&co** lockup (superscript numeral).
- **Section labels / "established" cues:** **spaced uppercase** in a clean sans
  (tracking ~0.1em) — evokes the sign's secondary text. Good for card-section
  headers ("FLIGHTS", "HOTELS") and metadata labels.
- **Body / UI:** a **highly readable humanist sans** (e.g. Inter / Work Sans).
  Crisp, never distressed — this carries the data.
- **Confirmation numbers** stay large, monospaced-or-tabular and tap-to-copy
  (existing PRD rule: confirmation # is the most prominent text on a card).

## 6. Texture & motifs (use with restraint)

- **Paper/linen surface:** a *very* subtle grain on cream backgrounds. Must not
  reduce text contrast.
- **Label-border frame:** the corner-broken rectangle as a frame for hero areas,
  the share-page header, or featured cards — not every card.
- **Double-arrow motif:** section dividers, a "← →" transit marker on flight/
  transport rows, or a back/share affordance.
- **Wood:** reserve real wood tone/texture for large brand moments (the share-page
  header band, the install/empty hero) — not behind dense data.

## 7. Screen-by-screen direction (real app surfaces)

- **Trips grid (`/trips`, home):** the brand's front door. Wordmark header;
  trip cards as little framed "signs" with the cover photo, name, date range, and
  a status pill (UPCOMING / IN PROGRESS / PAST) styled like a stamped label.
- **Trip detail (`/trips/:id`):** collapsible card sections with the spaced-caps
  labels + section icon; the "last synced" line; Share / Edit in the header.
- **Card detail (`/trips/:id/:section/:cardId`):** confirmation number as the hero
  element; clean label/value rows; the flight "Check Status" panel and
  "Add to budget" action as branded buttons.
- **Public share page (`/share/:token`):** the **most branded** surface (a guest's
  first impression) — wood/linen header band with the wordmark, "Shared itinerary"
  label, read-only cards. This is where to lean into the aesthetic.
- **Budget & Currency:** progress bar in honey→amber→red; keep numbers crisp.
- **Settings:** light/dark/system, home currency, install. A good place for a
  small "Established 2003 · Sarcasm, Sass & Class" footer easter egg.
- **Empty / loading states:** prime spots for dry, classy microcopy and the
  wordmark/arrow motif (e.g. trips empty: a witty line + a framed "New Trip" CTA).

## 8. Constraints & non-negotiables

- **Mobile-first**, designed at 390px first; **44×44px** min tap targets; 16px
  base font (prevents iOS zoom).
- **Light + dark mode** both required (dark via a `.dark` class on `<html>`).
- **Readability and contrast beat texture** every time. Data must stay glanceable.
- **Offline/PWA:** keep assets light — prefer CSS/SVG texture over big images;
  one or two web fonts max, subset if possible.
- **Don't re-architect.** Cards are config-driven (`src/lib/cardTypes.js`); file
  sections, routes, and flows stay as-is. This is a **reskin**: tokens + component
  styling + a few brand moments.

## 9. Deliverables to request

1. **Design tokens** — color (light+dark), type scale, spacing, radius, shadows —
   ideally as CSS variables / a Tailwind v4 `@theme` block (see §10).
2. **Wordmark + app icon** refresh based on the m⁶&co lockup.
3. **Mockups:** trips grid, trip detail, one card detail, the share page, and an
   empty state — in both light and dark.
4. **Component specs:** buttons, status pills, section headers, cards, inputs.

## 10. Technical integration notes (for whoever implements it)

- **Tailwind v4**, configured in `src/index.css` via `@import "tailwindcss"` —
  **no `tailwind.config.js`.** Express the palette as an `@theme` token block /
  CSS variables so it drops straight in.
- **Dark mode** is class-based: `@custom-variant dark (&:where(.dark, .dark *))`,
  toggled by `src/lib/theme.js`. Provide light + dark token values.
- Components are React + Tailwind utility classes (no component library). A token
  swap + restyle of shared elements (cards, headers, buttons, pills) propagates
  widely.
- Current look is cool **slate + sky-blue**; the target is **warm linen + charcoal
  + honey/walnut**. The main move is re-theming those neutrals and the accent.

---

*Brand: m⁶&co — Established 2003 — Sarcasm, Sass & Class.*
