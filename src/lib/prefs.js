// Small user preferences kept in localStorage (no server round-trip needed).

const HOME_CURRENCY_KEY = 'tripvault.homeCurrency'

export function getHomeCurrency() {
  return localStorage.getItem(HOME_CURRENCY_KEY) || 'USD'
}

export function setHomeCurrency(code) {
  localStorage.setItem(HOME_CURRENCY_KEY, code)
}
