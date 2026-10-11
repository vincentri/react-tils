import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { useSessionStorage } from './useSessionStorage'

let setStep: (next: number | ((prev: number) => number)) => void
const Step = () => {
  const [step, set] = useSessionStorage('step', 1)
  setStep = set
  return String(step)
}

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('useSessionStorage', () => {
  hookMatrix(() => useSessionStorage('step', 1))

  describe('with a stored value different from serverValue', () => {
    beforeEach(() => sessionStorage.setItem('step', '3'))
    hookMatrix(() => useSessionStorage('step', 1))
  })

  it('reads and writes sessionStorage, not localStorage', async () => {
    sessionStorage.setItem('step', '2')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Step)))
    expect(container.textContent).toBe('2')

    await act(async () => setStep((s) => s + 1))
    expect(sessionStorage.getItem('step')).toBe('3')
    expect(localStorage.getItem('step')).toBeNull()
    expect(container.textContent).toBe('3')

    await act(async () => root.unmount())
  })
})
