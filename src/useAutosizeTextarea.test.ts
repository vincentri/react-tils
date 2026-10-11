import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { componentMatrix } from './testing'
import { useAutosizeTextarea } from './useAutosizeTextarea'

let setText: (text: string) => void
const Chat = ({ maxRows }: { maxRows?: number | undefined }) => {
  const [text, set] = useState('')
  setText = set
  const ref = useAutosizeTextarea({ maxRows })
  return createElement('textarea', {
    ref,
    id: 'input',
    rows: 1,
    value: text,
    onChange: (e: { target: { value: string } }) => set(e.target.value),
    style: {
      lineHeight: '20px',
      padding: '5px',
      border: '1px solid',
      boxSizing: 'border-box',
    },
  })
}
const Default = () => createElement(Chat, {})

// happy-dom has no layout: the content is 20px per line, plus 10px of padding.
function fakeLayout(textarea: HTMLTextAreaElement) {
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    get: () => Math.max(1, textarea.value.split('\n').length) * 20 + 10,
  })
}

afterEach(() => vi.unstubAllGlobals())

async function setup(maxRows?: number) {
  const ro = fakeObserver('ResizeObserver')
  // Attached: happy-dom computes styles (line height, padding) only for elements in a document.
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const prototype = HTMLTextAreaElement.prototype
  Object.defineProperty(prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return Math.max(1, this.value.split('\n').length) * 20 + 10
    },
  })
  await act(async () => root.render(createElement(Chat, { maxRows })))
  const input = container.querySelector<HTMLTextAreaElement>('#input')!
  return {
    ro,
    input,
    height: () => input.style.height,
    overflow: () => input.style.overflowY,
    type: (value: string) =>
      act(async () => {
        input.value = value
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }),
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
      Reflect.deleteProperty(prototype, 'scrollHeight')
    },
  }
}

describe('useAutosizeTextarea', () => {
  componentMatrix(Default)

  it('grows with the text, including padding and borders, then scrolls after maxRows', async () => {
    const view = await setup(3)
    expect(view.height()).toBe('32px') // 1 line: 20 + 10 padding + 2 border
    expect(view.overflow()).toBe('hidden')

    await view.type('a\nb')
    expect(view.height()).toBe('52px')
    await view.type('a\nb\nc\nd\ne')
    expect(view.height()).toBe('72px') // capped at 3 lines
    expect(view.overflow()).toBe('auto')
    await view.cleanup()
  })

  it('shrinks when a controlled value is cleared from code, with no input event', async () => {
    const view = await setup()
    await act(async () => setText('one\ntwo\nthree'))
    expect(view.height()).toBe('72px')
    await act(async () => setText(''))
    expect(view.height()).toBe('32px')
    await view.cleanup()
  })

  it('remeasures when the width changes, not when only the height does', async () => {
    const view = await setup()
    fakeLayout(view.input)
    const setProperty = vi.spyOn(view.input.style, 'setProperty')
    await act(async () => view.ro.fire(view.input, { contentRect: { width: 0, height: 52 } }))
    expect(setProperty).not.toHaveBeenCalled()
    await act(async () => view.ro.fire(view.input, { contentRect: { width: 300, height: 52 } }))
    expect(setProperty).toHaveBeenCalled()
    await view.cleanup()
  })
})
