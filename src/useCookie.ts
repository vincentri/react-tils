import { useCallback, useSyncExternalStore } from 'react'

export type CookieOptions = {
  /** Lifetime in seconds. Default: until the browser session ends. */
  maxAgeSeconds?: number
  /** Default `'/'`, so the whole site sees it. */
  path?: string
  domain?: string
  /** Default `'lax'`. */
  sameSite?: 'strict' | 'lax' | 'none'
  /** Send only over HTTPS. Default: `true` on HTTPS pages. Required with `sameSite: 'none'`. */
  secure?: boolean
}

// `document.cookie` writes fire no event in the same tab, so writes through this hook notify
// directly. Other changes arrive through the Cookie Store API where supported, or on focus.
const listeners = new Set<() => void>()

type CookieStore = EventTarget
const cookieStore = () => (window as { cookieStore?: CookieStore }).cookieStore

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const store = cookieStore()
  store?.addEventListener('change', onChange)
  window.addEventListener('focus', onChange)
  return () => {
    listeners.delete(onChange)
    store?.removeEventListener('change', onChange)
    window.removeEventListener('focus', onChange)
  }
}

// Cookies set elsewhere (the server, other scripts) may not be URL-encoded, e.g. `a=100%`:
// keep those as written instead of throwing during render.
const decode = (text: string) => {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

function read(name: string): string | null {
  for (const pair of document.cookie.split('; ')) {
    const at = pair.indexOf('=')
    if (at !== -1 && decode(pair.slice(0, at)) === name) return decode(pair.slice(at + 1))
  }
  return null
}

function write(name: string, value: string, maxAge: number | undefined, options: CookieOptions) {
  const { path = '/', domain, sameSite = 'lax', secure = location.protocol === 'https:' } = options
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; samesite=${sameSite}`
  if (maxAge !== undefined) cookie += `; max-age=${maxAge}`
  // Removing: an expiry in the past too, for engines that ignore max-age=0.
  if (maxAge === 0) cookie += '; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  if (domain) cookie += `; domain=${domain}`
  if (secure) cookie += '; secure'
  document.cookie = cookie
  listeners.forEach((fn) => fn())
}

/**
 * A cookie's value, a setter, and a remover. Unlike browser-only state, a
 * cookie also reaches the server with the request: pass the request's value
 * as `serverValue`, and the server render, hydration, and the browser all
 * agree from the first frame.
 *
 * Re-renders when the cookie changes through this hook (in any component),
 * through the Cookie Store API's change event where the browser supports it,
 * and when the window regains focus, which catches changes made by the server
 * or another tab elsewhere. Values are strings, URL-encoded on write.
 *
 * Use when: a preference the server must also know on the first request, so
 * it can render the right thing: theme, locale, currency, a dismissed banner,
 * or an A/B test bucket.
 * Don't use when: the value is sensitive (session tokens); set those as
 * `HttpOnly` cookies on the server, which JavaScript can't read at all. For
 * client-only state, `useLocalStorage` holds more and doesn't ride along on
 * every request.
 *
 * Other libraries call this `useCookies` (react-cookie), `useCookieState`.
 *
 * @param name - The cookie name.
 * @param serverValue - The value on the server and during hydration: read it from the request
 * (e.g. `(await cookies()).get('theme')?.value` in Next.js). Default `null`.
 * @returns `[value, set, remove]`. `set(value, options?)` writes the cookie;
 * `remove(options?)` deletes it (pass the same `path` and `domain` it was set with).
 *
 * @example
 * // Server component: read the cookie from the request and pass it down.
 * const theme = (await cookies()).get('theme')?.value ?? null
 * return <ThemeToggle serverTheme={theme} />
 *
 * // Client component
 * function ThemeToggle({ serverTheme }: { serverTheme: string | null }) {
 *   const [theme, setTheme] = useCookie('theme', serverTheme)
 *   const next = theme === 'dark' ? 'light' : 'dark'
 *   return <button onClick={() => setTheme(next, { maxAgeSeconds: 60 * 60 * 24 * 365 })}>{next}</button>
 * }
 */
export function useCookie(
  name: string,
  serverValue: string | null = null,
): [
  string | null,
  (value: string, options?: CookieOptions) => void,
  (options?: CookieOptions) => void,
] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(name),
    () => serverValue,
  )
  const set = useCallback(
    (next: string, options: CookieOptions = {}) =>
      write(name, next, options.maxAgeSeconds, options),
    [name],
  )
  const remove = useCallback((options: CookieOptions = {}) => write(name, '', 0, options), [name])
  return [value, set, remove]
}
