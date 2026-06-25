import {
  toDateInput,
  toTimeInput,
  toDateTimeLocalInput,
} from '../lib/datetime'

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30'
const labelClass =
  'mb-1 block text-sm font-medium text-text-soft'

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN']

// Renders one form field from a card-type field config. `form` is the whole
// form object; `set(name, value)` updates a single key. Money fields write to
// both the amount and currency columns.
export default function Field({ field, form, set }) {
  const id = field.name
  const value = form[field.name] ?? ''

  if (field.type === 'money') {
    const currencyKey = field.currencyName
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label}
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={value}
            onChange={(e) => set(field.name, e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
          <select
            aria-label="Currency"
            value={form[currencyKey] ?? 'USD'}
            onChange={(e) => set(currencyKey, e.target.value)}
            className={`${inputClass} w-28 shrink-0`}
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <select
          id={id}
          required={field.required}
          value={value}
          onChange={(e) => set(field.name, e.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label}
        </label>
        <textarea
          id={id}
          rows={4}
          value={value}
          onChange={(e) => set(field.name, e.target.value)}
          className={inputClass}
        />
      </div>
    )
  }

  // Map config type -> native input type + value formatting.
  const typeMap = {
    text: { inputType: 'text', display: value },
    number: { inputType: 'number', display: value },
    date: { inputType: 'date', display: toDateInput(value) },
    time: { inputType: 'time', display: toTimeInput(value) },
    datetime: { inputType: 'datetime-local', display: toDateTimeLocalInput(value) },
  }
  const { inputType, display } = typeMap[field.type] || typeMap.text

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={inputType}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        required={field.required}
        placeholder={field.placeholder}
        value={display}
        onChange={(e) => set(field.name, e.target.value)}
        className={inputClass}
      />
    </div>
  )
}
