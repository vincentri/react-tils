import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { componentMatrix } from './testing'
import { type TextSelection, useTextSelection } from './useTextSelection'

let last: TextSelection | null
const Article = () => {
  const [ref, selection] = useTextSelection<HTMLElement>()
  last = selection
  return createElement('article', { ref, id: 'article' }, 'Hello selection world')
}

function select(node: Node, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
}

async function setup() {
  const container = document.createElement('div')
  const outside = document.createElement('p')
  outside.textContent = 'outside text'
  document.body.append(container, outside)
  const root = createRoot(container)
  await act(async () => root.render(createElement(Article)))
  const text = document.getElementById('article')!.firstChild!
  return {
    text,
    outside: outside.firstChild!,
    cleanup: async () => {
      document.getSelection()!.removeAllRanges()
      await act(async () => root.unmount())
      container.remove()
      outside.remove()
    },
  }
}

describe('useTextSelection', () => {
  componentMatrix(Article)

  it('reports a selection inside the element, and null when empty or outside', async () => {
    const view = await setup()
    expect(last).toBeNull()

    await act(async () => select(view.text, 6, 15))
    expect(last?.text).toBe('selection')
    expect(last?.range.toString()).toBe('selection')

    await act(async () => select(view.text, 5, 6)) // only a space
    expect(last).toBeNull()

    await act(async () => select(view.outside, 0, 7))
    expect(last).toBeNull()
    await view.cleanup()
  })

  it('waits while the pointer is down, then updates on release', async () => {
    const view = await setup()
    await act(async () => {
      document.dispatchEvent(new PointerEvent('pointerdown'))
      select(view.text, 0, 5)
    })
    expect(last).toBeNull()

    await act(async () => document.dispatchEvent(new PointerEvent('pointerup')))
    expect(last?.text).toBe('Hello')
    await view.cleanup()
  })
})
