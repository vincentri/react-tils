import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useScrollLock } from './useScrollLock'

const Lock = ({ locked }: { locked: boolean }) => {
  useScrollLock(locked)
  return null
}

async function mount(locked = true) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Lock, { locked })))
  return {
    set: (next: boolean) => act(async () => root.render(createElement(Lock, { locked: next }))),
    unmount: () => act(async () => root.unmount()),
  }
}

afterEach(() => {
  document.body.removeAttribute('style')
})

describe('useScrollLock', () => {
  hookMatrix(() => useScrollLock())

  it('locks once for nested locks and restores original styles after the last', async () => {
    document.body.style.overflow = 'auto'
    const outer = await mount()
    const inner = await mount()
    expect(document.body.style.overflow).toBe('hidden')

    await inner.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    await outer.unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('pads the body by the scrollbar width so the layout does not shift', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1009)
    const view = await mount()
    expect(document.body.style.paddingRight).toBe('15px')
    await view.unmount()
    expect(document.body.style.paddingRight).toBe('')
  })

  it('follows the locked flag', async () => {
    const view = await mount(false)
    expect(document.body.style.overflow).toBe('')
    await view.set(true)
    expect(document.body.style.overflow).toBe('hidden')
    await view.set(false)
    expect(document.body.style.overflow).toBe('')
    await view.unmount()
  })
})
