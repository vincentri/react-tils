import { useSyncExternalStore } from 'react'

const SERVER_LANGUAGES: readonly string[] = ['en']
let cached: readonly string[] = SERVER_LANGUAGES

function subscribe(onChange: () => void) {
  window.addEventListener('languagechange', onChange)
  return () => window.removeEventListener('languagechange', onChange)
}

// Same array until the list changes, so re-renders only happen on a real change.
function getLanguages(): readonly string[] {
  const next = navigator.languages
  if (next.join() !== cached.join()) cached = [...next]
  return cached
}

/**
 * The user's preferred languages from the browser, most preferred first
 * (`navigator.languages`), updated when the user changes them.
 *
 * Renders `serverValue` on the server and during hydration, then switches to
 * the browser's list with no hydration mismatch.
 *
 * Use when: picking a default locale, suggesting a translation, or formatting
 * with `Intl` in the user's language.
 * Don't use when: the server must render the right language on the first
 * response; read the `Accept-Language` header on the server instead, and pass
 * it as `serverValue` so the client agrees. Don't override a language the user
 * chose explicitly in your app.
 *
 * @param serverValue - Languages on the server and during hydration. Default
 * `['en']`. Pass the parsed `Accept-Language` header if you have it, as a
 * constant or memoized array.
 *
 * @example
 * const [language] = usePreferredLanguages()
 * const price = new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(9.99)
 */
export function usePreferredLanguages(
  serverValue: readonly string[] = SERVER_LANGUAGES,
): readonly string[] {
  return useSyncExternalStore(subscribe, getLanguages, () => serverValue)
}
