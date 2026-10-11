import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { type SwipeDirection, useSwipe } from './useSwipe'

const Card = ({ onSwipe }: { onSwipe: (d: SwipeDirection) => void }) => {
  const ref = useSwipe<HTMLDivElement>(onSwipe)
  return createElement('div', { ref, id: 'card' })
}
const Default = () => Card({ onSwipe: () => {} })

function pointer(target: EventTarget, type: string, x: number, y: number, timeStamp: number) {
  const event = new PointerEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    button: 0,
    isPrimary: true,
    pointerId: 1,
  })
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  target.dispatchEvent(event)
}

async function mount() {
  const onSwipe = vi.fn<(d: SwipeDirection) => void>()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(Card, { onSwipe })))
  const card = container.querySelector('#card')!
  const swipe = (dx: number, dy: number, ms = 200) => {
    pointer(card, 'pointerdown', 100, 100, 1000)
    pointer(card, 'pointerup', 100 + dx, 100 + dy, 1000 + ms)
  }
  return {
    onSwipe,
    swipe,
    card,
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('useSwipe', () => {
  componentMatrix(Default)

  it('reports the dominant direction', async () => {
    const view = await mount()
    view.swipe(-80, 10)
    view.swipe(80, -20)
    view.swipe(5, -90)
    view.swipe(-30, 70)
    expect(view.onSwipe.mock.calls.map((c) => c[0])).toEqual(['left', 'right', 'up', 'down'])
    await view.unmount()
  })

  it('ignores short, slow, and cancelled gestures', async () => {
    const view = await mount()
    view.swipe(30, 0)
    view.swipe(200, 0, 2000)
    pointer(view.card, 'pointerdown', 0, 0, 0)
    pointer(window, 'pointercancel', 0, 0, 10) // the browser took over for scrolling
    pointer(window, 'pointerup', 200, 0, 20)
    expect(view.onSwipe).not.toHaveBeenCalled()
    await view.unmount()
  })
})
