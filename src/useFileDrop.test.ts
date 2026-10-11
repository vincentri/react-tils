import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { useFileDrop } from './useFileDrop'

const Zone = ({ onDrop, enabled }: { onDrop: (files: File[]) => void; enabled?: boolean }) => {
  const [ref, isOver] = useFileDrop<HTMLDivElement>(onDrop, { enabled: enabled ?? true })
  return createElement(
    'div',
    { ref, id: 'zone' },
    createElement('span', { id: 'child' }),
    String(isOver),
  )
}
const Default = () => Zone({ onDrop: () => {} })

function drag(target: Element, type: string, files: File[] | null) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: files ? { types: ['Files'], files } : { types: ['text/plain'], files: [] },
  })
  target.dispatchEvent(event)
  return event
}

async function mount(onDrop: (files: File[]) => void, enabled?: boolean) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () =>
    root.render(createElement(Zone, { onDrop, ...(enabled !== undefined && { enabled }) })),
  )
  const zone = container.querySelector('#zone')!
  return {
    zone,
    child: container.querySelector('#child')!,
    text: () => zone.textContent,
    unmount: () => act(async () => root.unmount()),
  }
}

describe('useFileDrop', () => {
  componentMatrix(Default)

  it('stays over across child elements and delivers dropped files', async () => {
    const onDrop = vi.fn<(files: File[]) => void>()
    const view = await mount(onDrop)
    const file = new File(['hi'], 'a.txt', { type: 'text/plain' })

    await act(async () => drag(view.zone, 'dragenter', [file]))
    await act(async () => drag(view.child, 'dragenter', [file]))
    await act(async () => drag(view.zone, 'dragleave', [file])) // left the zone for its child
    expect(view.text()).toBe('true')

    const over = drag(view.child, 'dragover', [file])
    expect(over.defaultPrevented).toBe(true)
    let drop!: Event
    await act(async () => {
      drop = drag(view.child, 'drop', [file])
    })
    expect(drop.defaultPrevented).toBe(true)
    expect(onDrop).toHaveBeenCalledWith([file], expect.any(Event))
    expect(view.text()).toBe('false')
    await view.unmount()
  })

  it('ignores drags without files, and everything while disabled', async () => {
    const onDrop = vi.fn<(files: File[]) => void>()
    const view = await mount(onDrop)
    await act(async () => drag(view.zone, 'dragenter', null))
    expect(view.text()).toBe('false')
    expect(drag(view.zone, 'dragover', null).defaultPrevented).toBe(false)
    await view.unmount()

    const off = await mount(onDrop, false)
    await act(async () => drag(off.zone, 'dragenter', [new File([''], 'b')]))
    await act(async () => drag(off.zone, 'drop', [new File([''], 'b')]))
    expect(off.text()).toBe('false')
    expect(onDrop).not.toHaveBeenCalled()
    await off.unmount()
  })
})
