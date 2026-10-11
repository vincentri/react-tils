import { useEffect, useState } from 'react'

export type RovingFocusOptions = {
  /** Which arrow keys move focus. Default `'vertical'` (Up/Down). */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Wrap from the last item to the first and back. Default `true`. */
  loop?: boolean
  /** Typing letters moves to the next item whose text starts with them; repeating one letter cycles through matches. Default `true`. */
  typeahead?: boolean
  /** Which elements inside the container are items. Default: buttons, links, and elements with an item role (`menuitem`, `option`, `tab`, `radio`, `treeitem`). */
  selector?: string
}

// `^=menuitem` also covers menuitemcheckbox and menuitemradio.
const ITEMS =
  '[role^=menuitem],[role=option],[role=tab],[role=radio],[role=treeitem],button,a[href]'

function items(container: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) =>
      !el.matches(':disabled') &&
      !el.closest('[inert]') &&
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  )
}

// Typed letters must follow each other within this time to build one prefix.
const TYPEAHEAD_MS = 500

const label = (el: HTMLElement) =>
  (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().toLowerCase()

const selected = (el: HTMLElement) =>
  el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true'

/**
 * Arrow-key navigation between the items of a toolbar, menu, tab list,
 * listbox, or radio group, with a single Tab stop (a "roving tabindex").
 * Returns a callback ref for the container.
 *
 * Tab enters the group at the last focused item (or the selected one, else
 * the first) and Tab again leaves it. Arrow keys move between items, Home and
 * End jump to the ends, and typing letters jumps to the item whose text
 * starts with them. Left and Right swap in right-to-left content.
 * Disabled and hidden items are skipped. Items added later are included.
 *
 * Use when: a custom toolbar, menu, tab list, listbox, or segmented control.
 * Don't use when: native elements do it: radio buttons with the same `name`,
 * and `<select>`. Don't set `tabIndex` on the items yourself; the hook manages
 * it. Still add the ARIA roles (`role="toolbar"`, `role="tab"`, …) for screen
 * readers. Two-dimensional grids need more than this.
 *
 * Other libraries call this `useRovingTabIndex`.
 *
 * @param options - `orientation`, `loop`, `typeahead`, `selector`. Optional.
 * @returns A callback ref. Pass it to the container's `ref` prop.
 *
 * @example
 * const ref = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
 * return (
 *   <div ref={ref} role="toolbar" aria-label="Formatting">
 *     <button>Bold</button>
 *     <button>Italic</button>
 *     <button>Underline</button>
 *   </div>
 * )
 */
export function useRovingFocus<T extends HTMLElement = HTMLElement>(
  options: RovingFocusOptions = {},
): (element: T | null) => void {
  const { orientation = 'vertical', loop = true, selector = ITEMS, typeahead = true } = options
  const [container, setContainer] = useState<T | null>(null)

  useEffect(() => {
    if (!container) return
    let current: HTMLElement | undefined

    // Exactly one item is in the Tab order: the current one.
    const sync = () => {
      const list = items(container, selector)
      if (!current || !list.includes(current)) current = list.find(selected) ?? list[0]
      for (const el of list) el.setAttribute('tabindex', el === current ? '0' : '-1')
      return list
    }
    sync()

    const onFocusIn = (event: FocusEvent) => {
      const list = items(container, selector)
      if (!list.includes(event.target as HTMLElement)) return
      current = event.target as HTMLElement
      sync()
    }

    let typed = ''
    let typedAt = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const list = items(container, selector)
      const index = list.indexOf(event.target as HTMLElement)
      if (index === -1) return
      if (typeahead && event.key.length === 1 && event.key !== ' ') {
        typed = (event.timeStamp - typedAt < TYPEAHEAD_MS ? typed : '') + event.key.toLowerCase()
        typedAt = event.timeStamp
        // The same letter again cycles through items starting with it; otherwise match the prefix,
        // starting from the current item so typing more letters can stay on it.
        const cycling = /^(.)\1+$/.test(typed)
        const prefix = cycling ? typed[0]! : typed
        const from = cycling || typed.length === 1 ? index + 1 : index
        const ordered = [...list.slice(from), ...list.slice(0, from)]
        const match = ordered.find((el) => label(el).startsWith(prefix))
        if (match) {
          event.preventDefault()
          match.focus()
        }
        return
      }
      if (event.shiftKey) return
      const count = list.length
      const rtl = getComputedStyle(container).direction === 'rtl' ? -1 : 1
      // Steps from the current item; Home and End jump to the ends.
      const steps: Record<string, number> = { Home: -index, End: count - 1 - index }
      if (orientation !== 'horizontal') Object.assign(steps, { ArrowDown: 1, ArrowUp: -1 })
      if (orientation !== 'vertical') Object.assign(steps, { ArrowRight: rtl, ArrowLeft: -rtl })
      const step = steps[event.key]
      if (step === undefined) return
      const next = index + step
      event.preventDefault()
      list[loop ? (next + count) % count : Math.min(Math.max(next, 0), count - 1)]!.focus()
    }

    // Re-apply when items are added or removed; tabindex changes don't trigger it.
    const mutation = new MutationObserver(() => sync())
    mutation.observe(container, { childList: true, subtree: true })
    container.addEventListener('focusin', onFocusIn)
    container.addEventListener('keydown', onKeyDown)
    return () => {
      mutation.disconnect()
      container.removeEventListener('focusin', onFocusIn)
      container.removeEventListener('keydown', onKeyDown)
      // Unfiltered: hidden or detached items had a tabindex set too.
      for (const el of container.querySelectorAll(selector)) el.removeAttribute('tabindex')
    }
  }, [container, orientation, loop, selector, typeahead])

  return setContainer
}
