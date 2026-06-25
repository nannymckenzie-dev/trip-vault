// Pre-built one-tap tags (PRD "Quick Tags System"). Stored as a text[] on each
// card. The value persisted is the tag label itself, so the list is the source
// of truth for which tags are known.

export const QUICK_TAGS = [
  { label: 'Prepaid', classes: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
  { label: 'Breakfast included', classes: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  { label: 'Free cancellation', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { label: 'Requires ID', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { label: 'Need to print', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
  { label: 'Pick up on arrival', classes: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { label: 'Deposit required', classes: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  { label: 'Dress code', classes: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { label: 'Flexible dates', classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
]

const BY_LABEL = Object.fromEntries(QUICK_TAGS.map((t) => [t.label, t]))

export function tagClasses(label) {
  return BY_LABEL[label]?.classes ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
}
