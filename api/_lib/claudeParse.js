import Anthropic from '@anthropic-ai/sdk'

// Email → structured travel data via Claude. Model per PRD: claude-sonnet-4-6.
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are a travel confirmation email parser. Extract structured data from the email the user provides and return ONLY valid JSON — no prose, no markdown, no code fences.

Identify each booking's type from: flight, hotel, activity, restaurant, ground_transport, ticket, travel_insurance, or unknown.

Return exactly this envelope:
{
  "results": [
    {
      "type": "flight",
      "confidence": 0.0,
      "data": { /* fields for that type — see below. Use null for anything not found. */ },
      "has_pdf_attachment": false,
      "notes_suggestion": "Anything important that did not fit a structured field, else null"
    }
  ]
}

A single email may contain multiple bookings (e.g. outbound + return flight) — return one results entry per booking. If the email is not a travel confirmation, return { "results": [ { "type": "unknown", "confidence": 0.0, "data": {}, "has_pdf_attachment": false, "notes_suggestion": null } ] }.

Field names per type (omit/null anything absent; dates ISO 8601, currency as ISO 4217 codes):
- flight: airline, flight_number, confirmation_code, depart_airport, depart_datetime, depart_terminal, depart_gate, arrive_airport, arrive_datetime, arrive_terminal, seat, baggage, ticket_class
- hotel: name, confirmation_number, checkin_date, checkout_date, checkin_time, checkout_time, address, phone, room_type, rate_per_night, currency, cancellation_policy, whats_included
- activity: name, activity_date, activity_time, duration, confirmation_number, address, operator, cost, currency, whats_included, cancellation_policy
- restaurant: name, reservation_date, reservation_time, party_size, confirmation_number, address, phone
- ground_transport: transport_type, company, confirmation_number, pickup_datetime, pickup_location, dropoff_datetime, dropoff_location, vehicle_class, cost, currency
- ticket: name, use_date
- travel_insurance: provider, policy_number, emergency_contact, coverage_start, coverage_end

For airports, prefer "IATA — City" form (e.g. "FCO — Rome") when both are known.
Set has_pdf_attachment to true only if the email text indicates a PDF (e-ticket, boarding pass, voucher) is attached.`

let client
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

// Pull the first text block and parse it as JSON, tolerating stray code fences.
function extractJson(message) {
  const text = (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

// Returns { results: [...] }. `hasPdf` lets the caller force has_pdf_attachment
// true when Gmail actually reported a PDF part, regardless of the email text.
export async function parseEmail({ subject, body, hasPdf = false }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Subject: ${subject || '(no subject)'}\n\n${body || ''}`,
      },
    ],
  })

  let parsed
  try {
    parsed = extractJson(message)
  } catch {
    return { results: [{ type: 'unknown', confidence: 0, data: {}, has_pdf_attachment: hasPdf, notes_suggestion: null }] }
  }

  const results = Array.isArray(parsed?.results) ? parsed.results : []
  return {
    results: results.map((r) => ({
      type: r?.type || 'unknown',
      confidence: typeof r?.confidence === 'number' ? r.confidence : 0,
      data: r?.data && typeof r.data === 'object' ? r.data : {},
      has_pdf_attachment: Boolean(r?.has_pdf_attachment) || hasPdf,
      notes_suggestion: r?.notes_suggestion ?? null,
    })),
  }
}
