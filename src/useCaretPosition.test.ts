import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { type CaretPosition, useCaretPosition } from './useCaretPosition'

let caret: CaretPosition | null
const Field = () => {
  const [ref, position] = useCaretPosition()
  caret = position
  return createElement('textarea', { ref, id: 'field', style: { lineHeight: '18px' } })
}

// happy-dom has no layout, so positions are 0 here; the browser tests check real coordinates.
describe('useCaretPosition', () => {
  componentMatrix(Field)

  beforeEach(() => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] }))
  afterEach(() => vi.useRealTimers())

  it('is null until the field is focused, measures while focused, and leaves no mirror behind', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => root.render(createElement(Field)))
    const field = container.querySelector('textarea')!
    expect(caret).toBeNull()

    const children = document.body.childElementCount
    await act(async () => {
      field.focus()
      field.dispatchEvent(new Event('focus'))
    })
    expect(caret).toBeNull() // measured on the next frame, not inside the event
    await act(async () => vi.advanceTimersToNextFrame())
    expect(caret).toMatchObject({ height: 18 })
    expect(document.body.childElementCount).toBe(children) // the measuring copy was removed

    await act(async () => {
      field.blur()
      field.dispatchEvent(new Event('blur'))
      vi.advanceTimersToNextFrame()
    })
    expect(caret).toBeNull()
    await act(async () => root.unmount())
    container.remove()
  })
})
