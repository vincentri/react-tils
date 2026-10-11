import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useFocusWithin } from './useFocusWithin'

let focused = false
const onEnter = vi.fn<() => void>()
const onLeave = vi.fn<() => void>()
const Menu = () => {
  const [ref, isFocused] = useFocusWithin<HTMLDivElement>({ onEnter, onLeave })
  focused = isFocused
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { ref },
      createElement('button', { id: 'first' }, 'first'),
      createElement('button', { id: 'second' }, 'second'),
    ),
    createElement('button', { id: 'outside' }, 'outside'),
  )
}

const focus = (id: string) =>
  act(async () => {
    document.getElementById(id)!.focus()
    await vi.runAllTimersAsync()
  })

describe('useFocusWithin', () => {
  hookMatrix(() => useFocusWithin()[1])

  describe('with fake timers', () => {
    let container: HTMLDivElement
    beforeEach(() => {
      vi.useFakeTimers()
      container = document.createElement('div')
      document.body.append(container)
    })
    afterEach(() => {
      container.remove()
      vi.useRealTimers()
      onEnter.mockClear()
      onLeave.mockClear()
    })

    it('enters, moves inside without leaving, and leaves', async () => {
      const root = createRoot(container)
      await act(async () => root.render(createElement(Menu)))
      expect(focused).toBe(false)

      await focus('first')
      expect(focused).toBe(true)
      expect(onEnter).toHaveBeenCalledOnce()

      await focus('second') // Tab inside
      expect(focused).toBe(true)
      expect(onLeave).not.toHaveBeenCalled()

      await focus('outside')
      expect(focused).toBe(false)
      expect(onLeave).toHaveBeenCalledOnce()
      await act(async () => root.unmount())
    })

    it("doesn't leave when the window loses focus", async () => {
      const root = createRoot(container)
      await act(async () => root.render(createElement(Menu)))
      await focus('first')

      // Switching windows: focusout fires, but activeElement stays put.
      await act(async () => {
        document
          .getElementById('first')!
          .dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        await vi.runAllTimersAsync()
      })
      expect(focused).toBe(true)
      expect(onLeave).not.toHaveBeenCalled()

      await act(async () => root.unmount())
    })
  })
})
