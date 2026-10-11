import { useSyncExternalStore } from 'react'

export type VisualViewportState = {
  /** Visible width in CSS pixels. */
  width: number
  /** Visible height in CSS pixels; shrinks when the on-screen keyboard opens. */
  height: number
  offsetTop: number
  offsetLeft: number
  /** Pinch-zoom scale. */
  scale: number
  /** How much of the layout viewport's bottom is hidden, usually by the on-screen keyboard. */
  bottomInset: number
}

const SERVER_VIEWPORT: VisualViewportState = {
  width: 0,
  height: 0,
  offsetTop: 0,
  offsetLeft: 0,
  scale: 1,
  bottomInset: 0,
}
let cached: VisualViewportState = SERVER_VIEWPORT

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport
  window.addEventListener('resize', onChange)
  viewport?.addEventListener('resize', onChange)
  viewport?.addEventListener('scroll', onChange)
  return () => {
    window.removeEventListener('resize', onChange)
    viewport?.removeEventListener('resize', onChange)
    viewport?.removeEventListener('scroll', onChange)
  }
}

// Same object until a value changes, so unchanged events don't re-render.
function getViewport(): VisualViewportState {
  const viewport = window.visualViewport
  const width = viewport?.width ?? window.innerWidth
  const height = viewport?.height ?? window.innerHeight
  const offsetTop = viewport?.offsetTop ?? 0
  const offsetLeft = viewport?.offsetLeft ?? 0
  const scale = viewport?.scale ?? 1
  const bottomInset = Math.max(0, Math.round(window.innerHeight - height - offsetTop))
  const next = { width, height, offsetTop, offsetLeft, scale, bottomInset }
  const changed = (Object.keys(next) as Array<keyof VisualViewportState>).some(
    (k) => next[k] !== cached[k],
  )
  if (changed) cached = next
  return cached
}

/**
 * The visual viewport: the part of the page actually visible, which shrinks
 * when the on-screen keyboard opens on phones and moves with pinch zoom.
 *
 * `bottomInset` is how many pixels at the bottom of the layout viewport are
 * covered, so a fixed bottom bar can move above the keyboard. Renders
 * `serverValue` on the server and during hydration. Falls back to the window
 * size where `visualViewport` is missing.
 *
 * Use when: keeping a chat input, bottom toolbar, or "Save" bar visible above
 * the mobile keyboard, or positioning UI correctly while pinch-zoomed.
 * Don't use when: you just need the window size; use `useWindowSize`. Where
 * supported, CSS can handle the keyboard: the
 * `interactive-widget=resizes-content` viewport meta setting, or
 * `env(keyboard-inset-height)` with the VirtualKeyboard API.
 *
 * @param serverValue - Value on the server and during hydration. Default all zeros, scale `1`.
 *
 * @example
 * const { bottomInset } = useVisualViewport()
 * return <form style={{ position: 'fixed', left: 0, right: 0, bottom: bottomInset }}><ChatInput /></form>
 */
export function useVisualViewport(
  serverValue: VisualViewportState = SERVER_VIEWPORT,
): VisualViewportState {
  return useSyncExternalStore(subscribe, getViewport, () => serverValue)
}
