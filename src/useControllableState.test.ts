import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { SetValue } from './internal/storage'
import { hookMatrix } from './testing'
import { useControllableState } from './useControllableState'

type Props = { value?: number; onChange?: (value: number) => void }
let set: SetValue<number>
const Counter = ({ value, onChange }: Props) => {
  const [count, setCount] = useControllableState(value, 0, onChange)
  set = setCount
  return String(count)
}

async function mount(props: Props) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Counter, props)))
  return {
    text: () => container.textContent,
    rerender: (next: Props) => act(async () => root.render(createElement(Counter, next))),
    unmount: () => act(async () => root.unmount()),
  }
}

describe('useControllableState', () => {
  hookMatrix(() => useControllableState(undefined, 'a'))

  it('uncontrolled: keeps its own state, calls onChange only on a change', async () => {
    const onChange = vi.fn<(value: number) => void>()
    const view = await mount({ onChange })
    expect(view.text()).toBe('0')

    await act(async () => set((n) => n + 1))
    expect(view.text()).toBe('1')
    expect(onChange).toHaveBeenLastCalledWith(1)

    await act(async () => set(1))
    expect(onChange).toHaveBeenCalledTimes(1)

    // Two updaters in one event both see the latest value.
    await act(async () => {
      set((n) => n + 1)
      set((n) => n + 1)
    })
    expect(view.text()).toBe('3')
    expect(onChange).toHaveBeenLastCalledWith(3)
    await view.unmount()
  })

  it('controlled: shows the prop, reports changes, and follows the parent', async () => {
    const onChange = vi.fn<(value: number) => void>()
    const view = await mount({ value: 5, onChange })
    await act(async () => {
      set((n) => n + 1)
      set((n) => n + 1)
    })
    expect(onChange.mock.calls).toEqual([[6], [7]])
    expect(view.text()).toBe('5') // the parent hasn't accepted it

    // The parent rejected the change: the next update starts from the prop again.
    await view.rerender({ value: 5, onChange })
    await act(async () => set((n) => n + 10))
    expect(onChange).toHaveBeenLastCalledWith(15)

    await view.rerender({ value: 9, onChange })
    expect(view.text()).toBe('9')
    await view.unmount()
  })
})
