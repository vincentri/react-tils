import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { type DragOptions, type DragState, useDrag } from './useDrag'

type Props = { onDrag: (drag: DragState) => void; options?: DragOptions }
const Handle = ({ onDrag, options }: Props) =>
  createElement('div', { ref: useDrag(onDrag, options), id: 'handle' })
const Default = () => createElement(Handle, { onDrag: () => {} })

const pointer = (target: EventTarget, type: string, x: number, y: number, init = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      button: 0,
      bubbles: true,
      ...init,
    }),
  )

// Whether text selection is blocked right now.
const select = () => {
  const event = new Event('selectstart', { cancelable: true })
  document.dispatchEvent(event)
  return event.defaultPrevented
}

async function setup(props: Props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (next: Props) => act(async () => root.render(createElement(Handle, next)))
  await render(props)
  const handle = container.querySelector<HTMLElement>('#handle')!
  // happy-dom has no pointer capture: record it.
  const captured = new Set<number>()
  handle.setPointerCapture = (id) => void captured.add(id)
  handle.releasePointerCapture = (id) => void captured.delete(id)
  handle.hasPointerCapture = (id) => captured.has(id)
  return {
    handle,
    captured,
    render,
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('useDrag', () => {
  componentMatrix(Default)

  it('reports distance and deltas from first to last, after the threshold, and captures the pointer', async () => {
    const onDrag = vi.fn<(drag: DragState) => void>()
    const view = await setup({ onDrag })
    pointer(view.handle, 'pointerdown', 100, 100)
    expect(view.captured.has(1)).toBe(true)

    pointer(view.handle, 'pointermove', 101, 101) // under the 3px threshold: still a click
    expect(onDrag).not.toHaveBeenCalled()

    pointer(view.handle, 'pointermove', 110, 100)
    pointer(view.handle, 'pointermove', 130, 90)
    pointer(view.handle, 'pointerup', 130, 90)
    const calls = onDrag.mock.calls.map(([{ dx, dy, deltaX, deltaY, first, last }]) => ({
      dx,
      dy,
      deltaX,
      deltaY,
      first,
      last,
    }))
    expect(calls).toEqual([
      { dx: 10, dy: 0, deltaX: 10, deltaY: 0, first: true, last: false },
      { dx: 30, dy: -10, deltaX: 20, deltaY: -10, first: false, last: false },
      { dx: 30, dy: -10, deltaX: 0, deltaY: 0, first: false, last: true },
    ])
    expect(view.captured.has(1)).toBe(false)
    await view.cleanup()
  })

  it('blocks text selection only while pressed, ignores other buttons and pointers, and stops when disabled', async () => {
    const onDrag = vi.fn<(drag: DragState) => void>()
    const view = await setup({ onDrag })
    pointer(view.handle, 'pointerdown', 0, 0, { button: 2, pointerType: 'mouse' }) // right click
    expect(select()).toBe(false)

    pointer(view.handle, 'pointerdown', 0, 0, { pointerType: 'mouse' })
    expect(select()).toBe(true)
    pointer(view.handle, 'pointermove', 50, 0, { pointerId: 2 }) // a second finger
    expect(onDrag).not.toHaveBeenCalled()
    pointer(view.handle, 'pointercancel', 0, 0)
    expect(select()).toBe(false)

    await view.render({ onDrag, options: { enabled: false } })
    pointer(view.handle, 'pointerdown', 0, 0)
    pointer(view.handle, 'pointermove', 50, 0)
    expect(onDrag).not.toHaveBeenCalled()
    await view.cleanup()
  })
})
