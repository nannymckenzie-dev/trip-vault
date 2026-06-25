import { CARD_TYPES } from './cardTypes'
import { dateTimeLocalToISO } from './datetime'

// Maps a Claude-parsed `type` to where its data lands. Card types resolve to a
// CARD_TYPES section (reusing the generic form + insert path); ticket and
// travel_insurance are file-backed and handled specially in the review queue.
export const PARSED_TYPE = {
  flight: { kind: 'card', section: 'flights' },
  hotel: { kind: 'card', section: 'hotels' },
  activity: { kind: 'card', section: 'activities' },
  restaurant: { kind: 'card', section: 'restaurants' },
  ground_transport: { kind: 'card', section: 'transport' },
  ticket: { kind: 'ticket' },
  travel_insurance: { kind: 'insurance' },
  unknown: { kind: 'unknown' },
}

export function targetFor(type) {
  return PARSED_TYPE[type] || PARSED_TYPE.unknown
}

// Human label for a parsed candidate's destination.
export function targetLabel(type) {
  const t = targetFor(type)
  if (t.kind === 'card') return CARD_TYPES[t.section].singular
  if (t.kind === 'ticket') return 'Ticket'
  if (t.kind === 'insurance') return 'Insurance document'
  return 'Unrecognized'
}

// Build a clean DB payload for a card-type candidate from the (possibly edited)
// form. Mirrors CardForm's buildPayload so imported rows match manual entries.
export function buildCardPayload(section, form) {
  const type = CARD_TYPES[section]
  const payload = {}
  for (const field of type.fields) {
    const raw = form[field.name]
    switch (field.type) {
      case 'datetime':
        payload[field.name] = dateTimeLocalToISO(raw)
        break
      case 'number':
        payload[field.name] = raw === '' || raw == null ? null : Number(raw)
        break
      case 'money':
        payload[field.name] = raw === '' || raw == null ? null : Number(raw)
        payload[field.currencyName] =
          payload[field.name] == null ? null : form[field.currencyName] || 'USD'
        break
      default:
        payload[field.name] = typeof raw === 'string' ? raw.trim() || null : raw ?? null
    }
  }
  payload.quick_tags = form.quick_tags ?? []
  return payload
}

// Decode a base64 attachment (from /api/gmail/attachment) into a File for upload.
export function base64ToFile(base64, filename, mime = 'application/pdf') {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new File([bytes], filename, { type: mime })
}
