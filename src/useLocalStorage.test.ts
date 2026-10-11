import { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useLocalStorage } from './useLocalStorage'

let setCount: (next: number | ((prev: number) => number)) => void
const Count = () => {
  const [count, set] = useLocalStorage('count', 0)
  setCount = set
  return String(count)
}

async function mount(...components: Array<() => string>) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () =>
    root.render(
      createElement(
        Fragment,
        null,
        components.map((c, i) => createElement(c, { key: i })),
      ),
    ),
  )
  return { container, unmount: () => act(async () => root.unmount()) }
}

afterEach(() => localStorage.clear())

describe('useLocalStorage', () => {
  hookMatrix(() => useLocalStorage('count', 0))

  describe('with a stored value different from serverValue', () => {
    beforeEach(() => localStorage.setItem('count', '5'))
    hookMatrix(() => useLocalStorage('count', 0))
  })

  it('reads the stored value', async () => {
    localStorage.setItem('count', '5')
    const { container, unmount } = await mount(Count)
    expect(container.textContent).toBe('5')
    await unmount()
  })

  it('writes JSON, supports updaters, and syncs every component in the tab', async () => {
    const { container, unmount } = await mount(Count, Count)
    await act(async () => setCount(2))
    await act(async () => setCount((c) => c + 1))
    expect(localStorage.getItem('count')).toBe('3')
    expect(container.textContent).toBe('33')
    await unmount()
  })

  it('follows writes from other tabs', async () => {
    const { container, unmount } = await mount(Count)
    localStorage.setItem('count', '7')
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'count' })))
    expect(container.textContent).toBe('7')
    await unmount()
  })

  it('reads corrupted data as serverValue and leaves it in place', async () => {
    localStorage.setItem('count', '{not json')
    const { container, unmount } = await mount(Count)
    expect(container.textContent).toBe('0')
    expect(localStorage.getItem('count')).toBe('{not json')
    await unmount()
  })

  it('removes the key when set to undefined', async () => {
    let set!: (next: string | undefined) => void
    const Name = () => {
      const [name, setName] = useLocalStorage<string | undefined>('name', undefined)
      set = setName
      return String(name)
    }
    const { container, unmount } = await mount(Name)
    await act(async () => set('ada'))
    expect(localStorage.getItem('name')).toBe('"ada"')
    await act(async () => set(undefined))
    expect(localStorage.getItem('name')).toBeNull()
    expect(container.textContent).toBe('undefined')
    await unmount()
  })

  it("still updates for this session when storage is full or blocked, and doesn't throw", async () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const view = await mount(Count)
    await act(async () => setCount(5))
    expect(view.container.textContent).toBe('5')
    expect(localStorage.getItem('count')).toBeNull()

    setItem.mockRestore() // space again: the next write is saved
    await act(async () => setCount((c) => c + 1))
    expect(view.container.textContent).toBe('6')
    expect(localStorage.getItem('count')).toBe('6')
    await view.unmount()
  })
})
