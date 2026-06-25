import { QUICK_TAGS, tagClasses } from '../lib/quickTags'

// Read-only pill badges, shown on list rows and detail headers.
export function TagBadges({ tags, className = '' }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagClasses(tag)}`}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

// Interactive selector used in forms and on the detail view: tap to toggle.
export function QuickTagPicker({ value = [], onChange }) {
  function toggle(label) {
    if (value.includes(label)) onChange(value.filter((t) => t !== label))
    else onChange([...value, label])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_TAGS.map((tag) => {
        const active = value.includes(tag.label)
        return (
          <button
            key={tag.label}
            type="button"
            onClick={() => toggle(tag.label)}
            aria-pressed={active}
            className={`min-h-[44px] rounded-full px-3 text-sm font-medium transition ${
              active
                ? tag.classes + ' ring-2 ring-offset-1 ring-current/40 dark:ring-offset-slate-900'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
