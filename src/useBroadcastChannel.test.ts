import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useBroadcastChannel } from './useBroadcastChannel'

const posts: Record<string, (message: string) => void> = {}
const Tab = ({ id, onMessage }: { id: string; onMessage: (m: string) => void }) => {
  posts[id] = useBroadcastChannel<string>('test-channel', onMessage)
  return null
}

// BroadcastChannel delivers asynchronously.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

describe('useBroadcastChannel', () => {
  hookMatrix(() => useBroadcastChannel('matrix-channel', () => {}))

  it('delivers to other instances, not the sender, and closes on unmount', async () => {
    const a = vi.fn<(m: string) => void>()
    const b = vi.fn<(m: string) => void>()
    const rootA = createRoot(document.createElement('div'))
    const rootB = createRoot(document.createElement('div'))
    await act(async () => rootA.render(createElement(Tab, { id: 'a', onMessage: a })))
    await act(async () => rootB.render(createElement(Tab, { id: 'b', onMessage: b })))

    posts.a!('hello')
    await flush()
    expect(b).toHaveBeenCalledWith('hello', expect.anything())
    expect(a).not.toHaveBeenCalled()

    await act(async () => rootB.unmount())
    posts.a!('after')
    await flush()
    expect(b).toHaveBeenCalledTimes(1)
    expect(() => posts.b!('closed')).not.toThrow() // post after unmount is a no-op
    await act(async () => rootA.unmount())
  })
})
