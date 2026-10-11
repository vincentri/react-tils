import { useEffect, useMemo, useState } from 'react'
import { useLatest } from './internal/useLatest'
import { useDocumentVisibility } from './useDocumentVisibility'

export type EventSourceStatus = 'connecting' | 'open' | 'closed'

export type EventSourceOptions = {
  /** Called for every message, including named `events`. Can change every render. */
  onMessage?: (event: MessageEvent<string>) => void
  /** Named events to receive too (`event: price` in the stream), besides unnamed messages. */
  events?: string[]
  /** Send cookies to another origin. Default `false`. */
  withCredentials?: boolean
  /** Disconnect while the tab is hidden, and reconnect when it is visible again. Default `false`. */
  pauseWhenHidden?: boolean
}

export type EventSourceState = {
  /** `'connecting'` (also while retrying), `'open'`, or `'closed'` (no `url`, or paused). */
  status: EventSourceStatus
  /** The latest message's `data`, or `null` before the first. Resets when `url` changes. */
  data: string | null
}

type State = { url: string | null; status: EventSourceStatus; data: string | null }

/**
 * Live updates from the server over Server-Sent Events (`EventSource`):
 * connects while `url` is set, closes on unmount or when `url` changes or is
 * `null`, and reconnects on its own.
 *
 * Browsers retry dropped connections themselves, but give up for good when
 * the server answers with an error status; this hook keeps retrying then,
 * waiting 1s, 2s, 4s, up to 30s between attempts. With `pauseWhenHidden`, a
 * background tab holds no connection.
 *
 * `data` is only the latest message: when several arrive at once, a render
 * may see just the last. To keep every message (a feed, a log), use
 * `onMessage`. Messages are strings; `JSON.parse` them yourself.
 *
 * Use when: one-way live updates: notifications, progress of a job, live
 * scores or prices, a dashboard, logs.
 * Don't use when: streaming an AI response from a `POST`; `EventSource` can
 * only `GET` and can't set headers, so read `fetch()`'s body stream (or use
 * your AI SDK). For two-way messaging, use a WebSocket library. To check for
 * changes every minute or so, polling with `useInterval` is simpler.
 *
 * Other libraries call this `useEventSource` (VueUse), `useSSE`, `useServerSentEvents`.
 *
 * @param url - The stream's URL, or `null` to stay disconnected.
 * @param options - `onMessage`, `events`, `withCredentials`, `pauseWhenHidden`. Optional.
 * @returns `{ status, data }`.
 *
 * @example
 * const { status, data } = useEventSource(`/api/jobs/${id}/progress`)
 * const percent = data ? JSON.parse(data).percent : 0
 * return <progress value={percent} max={100} aria-busy={status !== 'open'} />
 *
 * // Keep every message
 * const [items, setItems] = useState<Notification[]>([])
 * useEventSource('/api/notifications', {
 *   onMessage: (event) => setItems((list) => [JSON.parse(event.data), ...list]),
 *   pauseWhenHidden: true,
 * })
 */
export function useEventSource(
  url: string | null,
  options: EventSourceOptions = {},
): EventSourceState {
  const { events = [], withCredentials = false, pauseWhenHidden = false } = options
  const onMessageRef = useLatest(options.onMessage)
  const hidden = useDocumentVisibility() === 'hidden'
  const paused = pauseWhenHidden && hidden
  const target = paused ? null : url
  // A string, so a new `events` array each render doesn't reconnect. Newlines can't appear in names.
  const types = ['message', ...events].join('\n')
  const [state, setState] = useState<State>({ url, status: 'connecting', data: null })

  useEffect(() => {
    if (target === null) return
    let source: EventSource | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    const set = (status: EventSourceStatus) =>
      setState((s) => ({ url: target, status, data: s.url === target ? s.data : null }))
    const receive = (event: Event) => {
      const message = event as MessageEvent<string>
      setState({ url: target, status: 'open', data: message.data })
      onMessageRef.current?.(message)
    }
    const connect = () => {
      set('connecting')
      const es = (source = new EventSource(target, { withCredentials }))
      es.addEventListener('open', () => {
        attempt = 0
        set('open')
      })
      es.addEventListener('error', () => {
        set('connecting')
        if (es.readyState !== EventSource.CLOSED) return // the browser is retrying by itself
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempt, 30_000))
        attempt += 1 // not `attempt++`: React Compiler can't compile that in a closure yet
      })
      for (const type of types.split('\n')) es.addEventListener(type, receive)
    }
    connect()
    return () => {
      clearTimeout(retry)
      source?.close()
    }
  }, [target, withCredentials, types, onMessageRef])

  const current = state.url === url
  const status = target === null ? 'closed' : current ? state.status : 'connecting'
  const data = current ? state.data : null
  return useMemo(() => ({ status, data }), [status, data])
}
