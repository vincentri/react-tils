import { useSyncExternalStore } from 'react'

export type WindowSize = { width: number; height: number }

const SERVER_SIZE: WindowSize = { width: 0, height: 0 }
let cached: WindowSize = SERVER_SIZE

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

// Same object until the size changes, so unchanged resize events don't re-render.
function getSize(): WindowSize {
  const { innerWidth: width, innerHeight: height } = window
  if (width !== cached.width || height !== cached.height) cached = { width, height }
  return cached
}

/**
 * The window's inner width and height in CSS pixels, updated on resize. Like
 * `window.innerWidth`, the width includes a visible vertical scrollbar; for the
 * width without it, read `document.documentElement.clientWidth` or use
 * `useElementSize` on a full-width element.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * real size with no hydration mismatch. Re-renders only when the size actually
 * changes, on every resize event that changes it (not throttled).
 *
 * Use when: JS needs exact pixel values, e.g. canvas sizing, virtualized lists,
 * or positioning a popover inside the viewport.
 * Don't use when: you only need a breakpoint; use `useMediaQuery`, which
 * re-renders only when the breakpoint flips. For styling, use CSS. For an
 * element's size, use CSS container queries or a ResizeObserver.
 *
 * @param serverValue - Size on the server and during hydration. Default
 * `{ width: 0, height: 0 }`. Pass a constant, not an inline object.
 *
 * @example
 * const { width, height } = useWindowSize()
 * return <canvas width={width} height={height} />
 */
export function useWindowSize(serverValue: WindowSize = SERVER_SIZE): WindowSize {
  return useSyncExternalStore(subscribe, getSize, () => serverValue)
}
