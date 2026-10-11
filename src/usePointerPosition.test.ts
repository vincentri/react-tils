import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { type PointerPosition, usePointerPosition } from './usePointerPosition'

let position: PointerPosition | null
let box: HTMLDivElement
const Card = ({ show = true }: { show?: boolean }) => {
  const [ref, pointer] = usePointerPosition<HTMLDivElement>()
  position = pointer
  return show
    ? createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          ref(el)
          if (el) {
            box = el
            el.getBoundingClientRect = () =>
              DOMRect.fromRect({ x: 100, y: 50, width: 200, height: 100 })
          }
        },
      })
    : null
}

const pointer = (type: string, clientX = 0, clientY = 0) =>
  act(async () => box.dispatchEvent(new PointerEvent(type, { clientX, clientY })))

describe('usePointerPosition', () => {
  hookMatrix(() => usePointerPosition()[1])

  it('reports the position relative to the element, and null outside it', async () => {
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Card)))
    expect(position).toBeNull()

    await pointer('pointermove', 130, 60)
    expect(position).toEqual({ x: 30, y: 10 })
    await pointer('pointermove', 290, 140)
    expect(position).toEqual({ x: 190, y: 90 })
    await pointer('pointerleave')
    expect(position).toBeNull()

    // The element going away clears a position it left behind.
    await pointer('pointermove', 130, 60)
    await act(async () => root.render(createElement(Card, { show: false })))
    expect(position).toBeNull()
    await act(async () => root.unmount())
  })
})
