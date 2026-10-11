import { type RefObject, useEffect } from 'react'
import { useLatest } from './internal/useLatest'

/** Where to listen: `'window'` and `'document'` are strings so they are safe to pass during server render. */
export type EventListenerTarget =
  | 'window'
  | 'document'
  | EventTarget
  | RefObject<EventTarget | null>
  | null
  | undefined

/** The event map for a target, so `type` autocompletes and the handler gets the right event type. */
export type EventMapFor<T> = T extends 'window'
  ? WindowEventMap
  : T extends 'document'
    ? DocumentEventMap
    : T extends HTMLElement | RefObject<HTMLElement | null>
      ? HTMLElementEventMap
      : Record<string, Event>

/** The event type for a name: typed for known events, plain `Event` for custom ones. */
export type EventFor<T, K> = K extends keyof EventMapFor<T> ? EventMapFor<T>[K] : Event

function resolve(target: EventListenerTarget): EventTarget | null | undefined {
  if (target === 'window') return window
  if (target === 'document') return document
  if (target && 'current' in target) return target.current
  return target
}

/**
 * Adds an event listener and removes it on unmount, like `addEventListener`
 * in an effect, but always calls the latest `handler` without re-subscribing.
 *
 * Pass `'window'` or `'document'` as strings (safe on the server), an element,
 * a ref object, or `null` to not listen. Re-subscribes only when the target,
 * `type`, or options change.
 *
 * Use when: no dedicated hook covers the event, e.g. `keydown` for a game,
 * `message` from an iframe, or `pointermove` while dragging.
 * Don't use when: a dedicated hook exists (`useWindowSize`, `useOnline`,
 * `useHotkey`, `useClickOutside`, ...); they also give a server value and
 * avoid re-renders. For element events in your own JSX, use props like
 * `onClick`.
 *
 * @param target - `'window'`, `'document'`, an `EventTarget`, a ref, or `null`.
 * @param type - The event name, e.g. `'keydown'`, or a custom event name.
 * @param handler - Called with the event. Can change every render.
 * @param options - `capture`, `passive`, `once`. Same as `addEventListener`.
 *
 * @example
 * useEventListener('window', 'message', (event) => {
 *   if (event.origin === 'https://widget.example.com') setData(event.data)
 * })
 *
 * const ref = useRef<HTMLDivElement>(null)
 * useEventListener(ref, 'pointermove', (event) => setX(event.clientX), { passive: true })
 */
export function useEventListener<
  T extends EventListenerTarget,
  // `string & {}` allows custom event names while keeping autocomplete for known ones.
  K extends (keyof EventMapFor<T> & string) | (string & {}),
>(
  target: T,
  type: K,
  handler: (event: EventFor<T, K>) => void,
  options: Pick<AddEventListenerOptions, 'capture' | 'passive' | 'once'> = {},
): void {
  const handlerRef = useLatest(handler)
  const { capture = false, passive, once = false } = options

  useEffect(() => {
    const element = resolve(target)
    if (!element) return
    const listener = (event: Event) => handlerRef.current(event as EventFor<T, K>)
    const listenerOptions: AddEventListenerOptions = { capture, once }
    if (passive !== undefined) listenerOptions.passive = passive
    element.addEventListener(type, listener, listenerOptions)
    return () => element.removeEventListener(type, listener, { capture })
  }, [target, type, capture, passive, once, handlerRef])
}
