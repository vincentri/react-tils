import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

export type Fullscreen = {
  /** `false` where elements can't go fullscreen (e.g. iPhone Safari), on the server, and during hydration. */
  supported: boolean
  /** `true` while this element is fullscreen. */
  active: boolean
  /** Make the element fullscreen. Resolves `false` if the browser refuses. Call from a user action. */
  enter: () => Promise<boolean>
  /** Leave fullscreen if this element is fullscreen. */
  exit: () => Promise<void>
  toggle: () => Promise<void>
}

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

/**
 * Puts an element into fullscreen and tracks whether it is, including when
 * the user leaves with Esc or a browser control.
 *
 * Returns a callback ref for the element and controls. `enter` must be called
 * from a user action (click, keypress); browsers refuse otherwise.
 *
 * Use when: a fullscreen button for a video player, image viewer, slideshow,
 * game, or map.
 * Don't use when: you only need a large layout; use CSS (`position: fixed;
 * inset: 0`). On iPhone, only `<video>` can go fullscreen, through the video's
 * own controls, so check `supported` before showing the button.
 *
 * @returns `[ref, { supported, active, enter, exit, toggle }]`.
 *
 * @example
 * const [ref, fullscreen] = useFullscreen<HTMLDivElement>()
 * return (
 *   <div ref={ref}>
 *     <Slides />
 *     {fullscreen.supported && (
 *       <button onClick={fullscreen.toggle}>{fullscreen.active ? 'Exit' : 'Fullscreen'}</button>
 *     )}
 *   </div>
 * )
 */
export function useFullscreen<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  Fullscreen,
] {
  const [element, setElement] = useState<T | null>(null)
  const supported = useSyncExternalStore(
    subscribe,
    () => document.fullscreenEnabled === true,
    () => false,
  )
  const active = useSyncExternalStore(
    subscribe,
    () => element !== null && document.fullscreenElement === element,
    () => false,
  )

  const enter = useCallback(async () => {
    if (!element || !document.fullscreenEnabled) return false
    try {
      await element.requestFullscreen()
      return true
    } catch {
      return false
    }
  }, [element])

  const exit = useCallback(async () => {
    if (element && document.fullscreenElement === element) await document.exitFullscreen()
  }, [element])

  const toggle = useCallback(async () => {
    if (active) await exit()
    else await enter()
  }, [active, enter, exit])

  return [
    setElement,
    useMemo(
      () => ({ supported, active, enter, exit, toggle }),
      [supported, active, enter, exit, toggle],
    ),
  ]
}
