import { StrictMode, act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { usePrevious } from './usePrevious'

let setPrice: (price: number) => void
let rerender: () => void
const Price = () => {
  const [price, set] = useState(10)
  const [, force] = useState(0)
  setPrice = set
  rerender = () => force((n) => n + 1)
  const previous = usePrevious(price)
  return `${previous ?? '-'} → ${price}`
}

describe('usePrevious', () => {
  hookMatrix(() => usePrevious(1))

  it('returns the value before the last change, and keeps it across unrelated re-renders', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(StrictMode, null, createElement(Price))))
    expect(container.textContent).toBe('- → 10')

    await act(async () => setPrice(12))
    expect(container.textContent).toBe('10 → 12')
    await act(async () => rerender()) // the ref version would show 12 → 12 here
    expect(container.textContent).toBe('10 → 12')
    await act(async () => setPrice(12)) // same value: no change
    expect(container.textContent).toBe('10 → 12')
    await act(async () => setPrice(9))
    expect(container.textContent).toBe('12 → 9')
    await act(async () => root.unmount())
  })
})
