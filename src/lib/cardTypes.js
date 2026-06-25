// Config-driven definitions for the five Phase 2 card types. Each entry drives
// the generic form, detail view, and list row — so adding a field is a one-line
// change here rather than touching multiple components.
//
// Field types: text | textarea | date | time | datetime | number | select | money
//   - `prominent: true`  → rendered large on the detail view (confirmation #s)
//   - money fields map an amount column + a paired currency column.
//
// `section` is the URL segment (/trips/:id/:section/...); `table` is the DB table.

import { formatDate, formatDateTime, formatTime, formatMoney } from './datetime'

const TRANSPORT_TYPES = ['Rental car', 'Train', 'Bus', 'Transfer', 'Ferry', 'Other']

const join = (...parts) => parts.filter(Boolean).join(' ')

export const CARD_TYPES = {
  flights: {
    section: 'flights',
    table: 'flights',
    singular: 'Flight',
    plural: 'Flights',
    // lucide "plane"
    icon: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
    fields: [
      { name: 'airline', label: 'Airline', type: 'text', required: true },
      { name: 'flight_number', label: 'Flight number', type: 'text', placeholder: 'DL447' },
      { name: 'confirmation_code', label: 'Confirmation code', type: 'text', prominent: true },
      { name: 'depart_airport', label: 'Departure airport', type: 'text', placeholder: 'JFK — New York' },
      { name: 'depart_datetime', label: 'Departure date/time', type: 'datetime' },
      { name: 'depart_terminal', label: 'Departure terminal', type: 'text' },
      { name: 'depart_gate', label: 'Departure gate', type: 'text' },
      { name: 'arrive_airport', label: 'Arrival airport', type: 'text', placeholder: 'FCO — Rome' },
      { name: 'arrive_datetime', label: 'Arrival date/time', type: 'datetime' },
      { name: 'arrive_terminal', label: 'Arrival terminal', type: 'text' },
      { name: 'seat', label: 'Seat assignment', type: 'text' },
      { name: 'baggage', label: 'Baggage allowance', type: 'text' },
      { name: 'ticket_class', label: 'Ticket class', type: 'text', placeholder: 'Economy' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    confirmationField: 'confirmation_code',
    sortKey: 'depart_datetime',
    title: (r) => join(r.airline, r.flight_number) || 'Flight',
    subtitle: (r) => [r.depart_airport, r.arrive_airport].filter(Boolean).join(' → '),
    meta: (r) => formatDateTime(r.depart_datetime),
  },

  hotels: {
    section: 'hotels',
    table: 'hotels',
    singular: 'Hotel',
    plural: 'Hotels',
    // lucide "bed-double"
    icon: 'M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M2 20h.01M22 20h-.01M6 8h4M14 8h4',
    fields: [
      { name: 'name', label: 'Hotel name', type: 'text', required: true },
      { name: 'confirmation_number', label: 'Confirmation number', type: 'text', prominent: true },
      { name: 'checkin_date', label: 'Check-in date', type: 'date' },
      { name: 'checkout_date', label: 'Check-out date', type: 'date' },
      { name: 'checkin_time', label: 'Check-in time', type: 'time' },
      { name: 'checkout_time', label: 'Check-out time', type: 'time' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'phone', label: 'Phone number', type: 'text' },
      { name: 'room_type', label: 'Room type', type: 'text' },
      { name: 'rate_per_night', label: 'Rate per night', type: 'money', currencyName: 'currency' },
      { name: 'cancellation_policy', label: 'Cancellation policy', type: 'text' },
      { name: 'whats_included', label: "What's included", type: 'text', placeholder: 'Breakfast daily, free parking' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    confirmationField: 'confirmation_number',
    sortKey: 'checkin_date',
    title: (r) => r.name || 'Hotel',
    subtitle: (r) => r.address || '',
    meta: (r) =>
      [formatDate(r.checkin_date), formatDate(r.checkout_date)].filter(Boolean).join(' → '),
  },

  activities: {
    section: 'activities',
    table: 'activities',
    singular: 'Activity',
    plural: 'Activities',
    // lucide "star"
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z',
    fields: [
      { name: 'name', label: 'Activity name', type: 'text', required: true },
      { name: 'activity_date', label: 'Date', type: 'date' },
      { name: 'activity_time', label: 'Time', type: 'time' },
      { name: 'duration', label: 'Duration', type: 'text', placeholder: '2 hours' },
      { name: 'confirmation_number', label: 'Confirmation number', type: 'text', prominent: true },
      { name: 'address', label: 'Meeting point / address', type: 'text' },
      { name: 'operator', label: 'Operator / company', type: 'text' },
      { name: 'cost', label: 'Cost', type: 'money', currencyName: 'currency' },
      { name: 'whats_included', label: "What's included", type: 'text' },
      { name: 'cancellation_policy', label: 'Cancellation policy', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    confirmationField: 'confirmation_number',
    sortKey: 'activity_date',
    title: (r) => r.name || 'Activity',
    subtitle: (r) => r.operator || r.address || '',
    meta: (r) => join(formatDate(r.activity_date), r.activity_time && formatTime(r.activity_time)),
  },

  restaurants: {
    section: 'restaurants',
    table: 'restaurants',
    singular: 'Restaurant',
    plural: 'Restaurants',
    // lucide "utensils"
    icon: 'M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
    fields: [
      { name: 'name', label: 'Restaurant name', type: 'text', required: true },
      { name: 'reservation_date', label: 'Date', type: 'date' },
      { name: 'reservation_time', label: 'Time', type: 'time' },
      { name: 'party_size', label: 'Party size', type: 'number' },
      { name: 'confirmation_number', label: 'Confirmation number', type: 'text', prominent: true },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    confirmationField: 'confirmation_number',
    sortKey: 'reservation_date',
    title: (r) => r.name || 'Restaurant',
    subtitle: (r) => (r.party_size ? `Party of ${r.party_size}` : r.address || ''),
    meta: (r) =>
      join(formatDate(r.reservation_date), r.reservation_time && formatTime(r.reservation_time)),
  },

  transport: {
    section: 'transport',
    table: 'ground_transport',
    singular: 'Ground transport',
    plural: 'Ground Transport',
    // lucide "car"
    icon: 'M19 17h2v-3.3a2 2 0 0 0-.5-1.3L18 9.5 16.7 6.6A2 2 0 0 0 14.9 5.4H5.6a2 2 0 0 0-1.8 1.2L2 11v6h2m15 0H9m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-6 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0M3 11h16',
    fields: [
      { name: 'transport_type', label: 'Type', type: 'select', options: TRANSPORT_TYPES, required: true },
      { name: 'company', label: 'Company / operator', type: 'text' },
      { name: 'confirmation_number', label: 'Confirmation number', type: 'text', prominent: true },
      { name: 'pickup_datetime', label: 'Pickup date/time', type: 'datetime' },
      { name: 'pickup_location', label: 'Pickup location', type: 'text' },
      { name: 'dropoff_datetime', label: 'Dropoff date/time', type: 'datetime' },
      { name: 'dropoff_location', label: 'Dropoff location', type: 'text' },
      { name: 'vehicle_class', label: 'Vehicle / class', type: 'text' },
      { name: 'cost', label: 'Cost', type: 'money', currencyName: 'currency' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    confirmationField: 'confirmation_number',
    sortKey: 'pickup_datetime',
    title: (r) => join(r.transport_type, r.company && `· ${r.company}`) || 'Transport',
    subtitle: (r) => r.pickup_location || '',
    meta: (r) => formatDateTime(r.pickup_datetime),
  },
}

export const CARD_SECTIONS = Object.keys(CARD_TYPES)

export function getCardType(section) {
  return CARD_TYPES[section] || null
}

// Build the flat list of column names a card type touches (incl. paired
// currency columns), used to assemble insert/update payloads.
export function payloadColumns(type) {
  const cols = []
  for (const f of type.fields) {
    cols.push(f.name)
    if (f.type === 'money' && f.currencyName) cols.push(f.currencyName)
  }
  return cols
}

export function formatMoneyField(row, field) {
  return formatMoney(row[field.name], field.currencyName ? row[field.currencyName] : null)
}
