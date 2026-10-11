import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useShare } from './useShare'

let api: ReturnType<typeof useShare>
const Share = () => {
  api = useShare()
  return null
}

async function mount() {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Share)))
  return () => act(async () => root.unmount())
}

function fakeShare(behavior: 'ok' | 'cancel', canShare = true) {
  const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {
    if (behavior === 'cancel') throw new DOMException('cancelled', 'AbortError')
  })
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => canShare })
  return share
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(navigator, 'canShare')
})

describe('useShare', () => {
  hookMatrix(() => useShare().supported)

  it('shares and reports success', async () => {
    const share = fakeShare('ok')
    const unmount = await mount()
    expect(api.supported).toBe(true)
    expect(await api.share({ url: 'https://example.com' })).toBe(true)
    expect(share).toHaveBeenCalledWith({ url: 'https://example.com' })
    await unmount()
  })

  it('returns false when the user cancels or the data cannot be shared', async () => {
    fakeShare('cancel')
    let unmount = await mount()
    expect(await api.share({ url: 'https://example.com' })).toBe(false)
    await unmount()

    const share = fakeShare('ok', false)
    unmount = await mount()
    expect(await api.share({ files: [] })).toBe(false)
    expect(share).not.toHaveBeenCalled()
    await unmount()
  })

  it('is unsupported without the Web Share API', async () => {
    let owner: object | null = navigator
    while (owner && !Object.hasOwn(owner, 'share')) owner = Object.getPrototypeOf(owner)
    const descriptor = owner && Object.getOwnPropertyDescriptor(owner, 'share')
    if (owner) Reflect.deleteProperty(owner, 'share')
    try {
      const unmount = await mount()
      expect(api.supported).toBe(false)
      expect(await api.share({ url: 'https://example.com' })).toBe(false)
      await unmount()
    } finally {
      if (owner && descriptor) Object.defineProperty(owner, 'share', descriptor)
    }
  })
})
