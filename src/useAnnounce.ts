import { useCallback, useEffect } from 'react'

export type Politeness = 'polite' | 'assertive'

// One visually hidden live region per politeness, shared by every component. Screen readers only
// announce changes to regions that already exist, so they are created on mount, not on announce.
const regions = new Map<Politeness, { element: HTMLElement; users: number }>()

const HIDDEN =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0'

function acquire(politeness: Politeness) {
  let region = regions.get(politeness)
  if (!region) {
    const element = document.createElement('div')
    element.setAttribute('aria-live', politeness)
    element.setAttribute('aria-atomic', 'true')
    element.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status')
    element.style.cssText = HIDDEN
    document.body.append(element)
    region = { element, users: 0 }
    regions.set(politeness, region)
  }
  region.users++
}

function release(politeness: Politeness) {
  const region = regions.get(politeness)
  if (!region || --region.users > 0) return
  region.element.remove()
  regions.delete(politeness)
}

/**
 * Returns `announce(message, politeness?)`, which reads a message to screen
 * reader users without moving focus or showing anything on screen. The same
 * message twice is announced twice.
 *
 * `'polite'` (default) waits until the screen reader is idle; `'assertive'`
 * interrupts it, for errors only. One hidden live region per politeness is
 * shared by all components and removed when the last one unmounts. The
 * function is stable. Nothing runs on the server.
 *
 * Use when: the result of an action isn't announced by itself: "Copied",
 * "Added to cart", "3 results", "Message sent", "Saved", or a validation
 * error that appears away from focus.
 * Don't use when: focus moves to the new content (a dialog, an inline
 * error with `aria-describedby`), or the text is in an element that already
 * has `role="status"` or `role="alert"`; screen readers read those anyway.
 *
 * Other libraries call this `useAnnouncer`, `useLiveAnnouncer`, `LiveAnnouncer`.
 *
 * @returns `announce(message, politeness?)`.
 *
 * @example
 * const announce = useAnnounce()
 * const [copy] = useCopyToClipboard()
 * return <button onClick={async () => (await copy(url)) && announce('Link copied')}>Copy link</button>
 */
export function useAnnounce(): (message: string, politeness?: Politeness) => void {
  useEffect(() => {
    acquire('polite')
    acquire('assertive')
    return () => {
      release('polite')
      release('assertive')
    }
  }, [])

  return useCallback((message: string, politeness: Politeness = 'polite') => {
    const region = regions.get(politeness)
    if (!region) return
    // Clear first, then set on the next frame: an unchanged text isn't announced again.
    region.element.textContent = ''
    requestAnimationFrame(() => {
      region.element.textContent = message
    })
  }, [])
}
