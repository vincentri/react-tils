import { useCallback, useSyncExternalStore } from 'react'

export type ScrollSpyOptions = {
  /** Distance in pixels from the top of the viewport to the line a section must cross to become active, e.g. a sticky header's height. Default `0`. */
  offset?: number
}

function subscribe(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/**
 * The id of the section the user is reading: the last of `ids` whose element
 * has scrolled past the top of the viewport (plus `offset`). At the bottom of
 * the page the last section is active, even if it is too short to reach the
 * top. `null` before the first section, on the server, and during hydration.
 *
 * Re-renders only when the active section changes. Sections are looked up by
 * id on each scroll, so they can mount later.
 *
 * Use when: highlighting the current section in a table of contents, a docs
 * sidebar, or step navigation on a long page.
 * Don't use when: the sections scroll inside a container rather than the page;
 * this follows the window. To know whether one element is on screen, use
 * `useInView`.
 *
 * Other libraries call this `useActiveSection`, `useScrollspy`.
 *
 * @param ids - Element ids of the sections, in page order.
 * @param options - `offset`: height of a sticky header in pixels. Optional.
 * @returns The active id, or `null`.
 *
 * @example
 * const ids = ['install', 'usage', 'api']
 * const active = useScrollSpy(ids, { offset: 64 })
 * return (
 *   <nav>
 *     {ids.map((id) => (
 *       <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{id}</a>
 *     ))}
 *   </nav>
 * )
 */
export function useScrollSpy(
  ids: readonly string[],
  options: ScrollSpyOptions = {},
): string | null {
  const { offset = 0 } = options
  // A string key, so a new array with the same ids every render doesn't change the snapshot.
  const key = ids.join('\n')

  const getSnapshot = useCallback(() => {
    const list = key ? key.split('\n') : []
    const root = document.documentElement
    const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2
    let active: string | null = null
    for (const id of list) {
      const element = document.getElementById(id)
      if (!element) continue
      if (atBottom || element.getBoundingClientRect().top <= offset + 1) active = id
    }
    return active
  }, [key, offset])

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
