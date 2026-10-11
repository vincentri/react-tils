import { useEffect, useState } from 'react'

export type RovingFocusOptions = {
  /** Which arrow keys move focus. Default `'vertical'` (Up/Down). */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /** Wrap from the last item to the first and back. Default `true`. */
  loop?: boolean
  /** Which elements inside the container are items. Default: buttons, links, and elements with an item role (`menuitem`, `option`, `tab`, `radio`, `treeitem`). */
  selector?: string
}

const ITEMS = [
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="treeitem"]',
  'button',
  'a[href]',
].join(',')

function items(container: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) =>
      !el.matches(':disabled') &&
      !el.closest('[inert]') &&
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  )
}

const selected = (el: HTMLElement) =>
  el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true'

/**
 * Arrow-key navigation between the items of a toolbar, menu, tab list,
 * listbox, or radio group, with a single Tab stop (a "roving tabindex").
 * Returns a callback ref for the container.
 *
 * Tab enters the group at the last focused item (or the selected one, else
 * the first) and Tab again leaves it. Arrow keys move between items, Home and
 * End jump to the ends. Left and Right swap in right-to-left content.
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
 * @param options - `orientation`, `loop`, `selector`. Optional.
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
  const { orientation = 'vertical', loop = true, selector = ITEMS } = options
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const list = items(container, selector)
      const index = list.indexOf(event.target as HTMLElement)
      if (index === -1) return
      const rtl = getComputedStyle(container).direction === 'rtl'
      const vertical = orientation !== 'horizontal'
      const horizontal = orientation !== 'vertical'
      let next: number
      if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = list.length - 1
      else if (
        (vertical && event.key === 'ArrowDown') ||
        (horizontal && event.key === (rtl ? 'ArrowLeft' : 'ArrowRight'))
      )
        next = index + 1
      else if (
        (vertical && event.key === 'ArrowUp') ||
        (horizontal && event.key === (rtl ? 'ArrowRight' : 'ArrowLeft'))
      )
        next = index - 1
      else return
      event.preventDefault()
      if (loop) next = (next + list.length) % list.length
      else next = Math.min(Math.max(next, 0), list.length - 1)
      list[next]!.focus()
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
  }, [container, orientation, loop, selector])

  return setContainer
}
