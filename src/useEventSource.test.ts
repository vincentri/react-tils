import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type EventSourceOptions, type EventSourceState, useEventSource } from './useEventSource'

class FakeEventSource extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  static all: FakeEventSource[] = []
  readyState = 0
  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    super()
    FakeEventSource.all.push(this)
  }
  close() {
    this.readyState = 2
  }
  open() {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }
  send(data: string, type = 'message') {
    this.dispatchEvent(new MessageEvent(type, { data }))
  }
  fail(readyState: 0 | 2) {
    this.readyState = readyState
    this.dispatchEvent(new Event('error'))
  }
}
const latest = () => FakeEventSource.all.at(-1)!
const live = () => FakeEventSource.all.filter((es) => es.readyState !== 2)

let state: EventSourceState
const Feed = ({
  url,
  options,
}: {
  url: string | null
  options?: EventSourceOptions | undefined
}) => {
  state = useEventSource(url, options)
  return null
}

async function mount(url: string | null, options?: EventSourceOptions) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Feed, { url, options })))
  return {
    rerender: (next: string | null, nextOptions?: EventSourceOptions) =>
      act(async () => root.render(createElement(Feed, { url: next, options: nextOptions }))),
    unmount: () => act(async () => root.unmount()),
  }
}

describe('useEventSource', () => {
  hookMatrix(() => useEventSource(null).status)

  it('renders connecting on the server, or closed without a url, and opens nothing', () => {
    expect(renderToString(createElement(() => useEventSource('/events').status))).toBe('connecting')
    expect(renderToString(createElement(() => useEventSource(null).status))).toBe('closed')
  })

  describe('with a fake EventSource', () => {
    beforeEach(() => {
      FakeEventSource.all = []
      vi.stubGlobal('EventSource', FakeEventSource)
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    })

    it('connects, receives messages and named events, and closes on unmount', async () => {
      const onMessage = vi.fn<(event: MessageEvent<string>) => void>()
      const view = await mount('/events', { onMessage, events: ['price'], withCredentials: true })
      expect(state).toEqual({ status: 'connecting', data: null })
      expect(latest().init).toEqual({ withCredentials: true })

      await act(async () => latest().open())
      expect(state.status).toBe('open')
      await act(async () => latest().send('hello'))
      await act(async () => latest().send('{"usd":3}', 'price'))
      expect(state.data).toBe('{"usd":3}')
      expect(onMessage.mock.calls.map(([event]) => [event.type, event.data])).toEqual([
        ['message', 'hello'],
        ['price', '{"usd":3}'],
      ])

      // A new options object each render doesn't reconnect.
      await view.rerender('/events', { onMessage, events: ['price'], withCredentials: true })
      expect(FakeEventSource.all).toHaveLength(1)
      await view.unmount()
      expect(live()).toHaveLength(0)
    })

    it('lets the browser retry a dropped connection, and retries with backoff when it gives up', async () => {
      const view = await mount('/events')
      await act(async () => latest().open())

      await act(async () => latest().fail(0)) // network drop: the browser reconnects by itself
      expect(state.status).toBe('connecting')
      expect(FakeEventSource.all).toHaveLength(1)

      await act(async () => latest().fail(2)) // error status: the browser gives up
      await act(async () => vi.advanceTimersByTimeAsync(999))
      expect(FakeEventSource.all).toHaveLength(1)
      await act(async () => vi.advanceTimersByTimeAsync(1))
      expect(FakeEventSource.all).toHaveLength(2)

      await act(async () => latest().fail(2))
      await act(async () => vi.advanceTimersByTimeAsync(1999))
      expect(FakeEventSource.all).toHaveLength(2)
      await act(async () => vi.advanceTimersByTimeAsync(1))
      expect(FakeEventSource.all).toHaveLength(3)

      // An open connection resets the backoff.
      await act(async () => latest().open())
      await act(async () => latest().fail(2))
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(FakeEventSource.all).toHaveLength(4)

      // Unmounting while waiting cancels the retry.
      await act(async () => latest().fail(2))
      await view.unmount()
      await act(async () => vi.advanceTimersByTimeAsync(60_000))
      expect(FakeEventSource.all).toHaveLength(4)
    })

    it('switches streams when url changes, dropping old data, and closes on null', async () => {
      const view = await mount('/rooms/1')
      await act(async () => latest().send('in room 1'))
      expect(state.data).toBe('in room 1')

      await view.rerender('/rooms/2')
      expect(state).toEqual({ status: 'connecting', data: null })
      expect(live().map((es) => es.url)).toEqual(['/rooms/2'])

      await view.rerender(null)
      expect(state.status).toBe('closed')
      expect(live()).toHaveLength(0)
      await view.unmount()
    })

    it('with pauseWhenHidden, holds no connection while the tab is hidden', async () => {
      const view = await mount('/events', { pauseWhenHidden: true })
      await act(async () => latest().send('before'))

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      await act(async () => document.dispatchEvent(new Event('visibilitychange')))
      expect(state).toEqual({ status: 'closed', data: 'before' })
      expect(live()).toHaveLength(0)

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      await act(async () => document.dispatchEvent(new Event('visibilitychange')))
      expect(live()).toHaveLength(1)
      expect(state.status).toBe('connecting')
      await view.unmount()
    })
  })
})
