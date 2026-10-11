import { useCallback, useEffect, useRef } from 'react'
import { useLatest } from './internal/useLatest'

/**
 * Sends and receives messages between tabs, windows, and iframes of the same
 * origin, over a `BroadcastChannel`.
 *
 * Opens the channel on mount and closes it on unmount. Always calls the latest
 * `onMessage`. The sender does not receive its own messages. Messages must be
 * structured-cloneable (plain objects, arrays, dates, maps; no functions or
 * class instances). Nothing happens on the server; `post` does nothing until
 * mounted.
 *
 * Use when: telling other tabs about an event, e.g. "logged out", "cart
 * updated", or "this tab is now the leader".
 * Don't use when: you are syncing a value that should also survive a reload;
 * use `useLocalStorage`, which syncs across tabs too. For messages to a
 * specific window or iframe, use `postMessage`.
 *
 * @param name - Channel name. Every tab using the same name shares the channel.
 * @param onMessage - Called with each message from other tabs. Can change every render.
 * @returns `post(message)`, stable for the life of the component.
 *
 * @example
 * const post = useBroadcastChannel<{ type: 'logout' }>('auth', (message) => {
 *   if (message.type === 'logout') router.replace('/login')
 * })
 * const logout = async () => {
 *   await api.logout()
 *   post({ type: 'logout' })
 * }
 */
export function useBroadcastChannel<T = unknown>(
  name: string,
  onMessage?: (message: T, event: MessageEvent<T>) => void,
): (message: T) => void {
  const handlerRef = useLatest(onMessage)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(name)
    channelRef.current = channel
    const listener = (event: MessageEvent<T>) => handlerRef.current?.(event.data, event)
    channel.addEventListener('message', listener)
    return () => {
      channel.removeEventListener('message', listener)
      channel.close()
      channelRef.current = null
    }
  }, [name, handlerRef])

  return useCallback((message: T) => channelRef.current?.postMessage(message), [])
}
