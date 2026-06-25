// Budget category definitions + helpers shared by the budget page and the
// "Add to budget" shortcut on cost-bearing cards.

export const BUDGET_CATEGORIES = [
  'Flights',
  'Hotels',
  'Food & Dining',
  'Activities & Tours',
  'Transport',
  'Shopping',
  'Other',
]

// Maps a card section to its natural budget category for the "Add to budget"
// pre-fill. Sections without a cost field aren't listed.
const SECTION_CATEGORY = {
  flights: 'Flights',
  hotels: 'Hotels',
  activities: 'Activities & Tours',
  restaurants: 'Food & Dining',
  transport: 'Transport',
}

export function categoryForSection(section) {
  return SECTION_CATEGORY[section] || 'Other'
}
