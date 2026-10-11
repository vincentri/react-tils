import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type UserMediaState, useUserMedia } from './useUserMedia'

function fakeMedia() {
  const streams: Array<{ stopped: () => boolean }> = []
  let reject: ((error: Error) => void) | undefined
  const getUserMedia = vi.fn<(c: MediaStreamConstraints) => Promise<MediaStream>>(
    (constraints) =>
      new Promise((resolve, fail) => {
        reject = fail
        const tracks = [{ stop: vi.fn<() => void>() }]
        streams.push({ stopped: () => tracks.every((t) => t.stop.mock.calls.length === 1) })
        resolve({ getTracks: () => tracks, constraints } as unknown as MediaStream)
      }),
  )
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  return { getUserMedia, streams, reject: (e: Error) => reject?.(e) }
}

let state: UserMediaState
const Camera = (props: { constraints: MediaStreamConstraints; enabled?: boolean }) => {
  state = useUserMedia(props.constraints, { enabled: props.enabled ?? true })
  return null
}

async function mount(props: { constraints: MediaStreamConstraints; enabled?: boolean }) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Camera, props)))
  return {
    rerender: (next: typeof props) => act(async () => root.render(createElement(Camera, next))),
    unmount: () => act(async () => root.unmount()),
  }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('useUserMedia', () => {
  hookMatrix(() => useUserMedia({ video: true }, { enabled: false }).loading)

  it('opens a stream and stops its tracks on unmount', async () => {
    const media = fakeMedia()
    const view = await mount({ constraints: { video: true } })
    expect(state.stream).not.toBeNull()
    expect(state.loading).toBe(false)
    await view.unmount()
    expect(media.streams[0]!.stopped()).toBe(true)
  })

  it('compares constraints by value, and restarts with fresh tracks when they change', async () => {
    const media = fakeMedia()
    const view = await mount({ constraints: { video: true } })
    await view.rerender({ constraints: { video: true } }) // new object, same value
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)

    await view.rerender({ constraints: { audio: true } })
    expect(media.getUserMedia).toHaveBeenCalledTimes(2)
    expect(media.streams[0]!.stopped()).toBe(true)
    expect(media.streams[1]!.stopped()).toBe(false)
    await view.unmount()
  })

  it('stops the stream when disabled and returns to idle', async () => {
    const media = fakeMedia()
    const view = await mount({ constraints: { video: true } })
    await view.rerender({ constraints: { video: true }, enabled: false })
    expect(media.streams[0]!.stopped()).toBe(true)
    expect(state).toEqual({ stream: null, error: null, loading: false })
    await view.unmount()
  })

  it('reports permission errors and missing support', async () => {
    const getUserMedia = vi.fn<() => Promise<MediaStream>>(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    let view = await mount({ constraints: { video: true } })
    expect(state.error?.name).toBe('NotAllowedError')
    expect(state.loading).toBe(false)
    await view.unmount()

    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    view = await mount({ constraints: { video: true } })
    expect(state.error?.message).toBe('getUserMedia is not supported')
    await view.unmount()
  })
})
