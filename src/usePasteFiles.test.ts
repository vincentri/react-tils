import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { type PasteFilesOptions, usePasteFiles } from './usePasteFiles'

type Props = { onFiles: (files: File[]) => void; options?: PasteFilesOptions }
const Composer = ({ onFiles, options }: Props) =>
  createElement(
    'div',
    { ref: usePasteFiles(onFiles, options) },
    createElement('textarea', { id: 'input' }),
  )
const Default = () => createElement(Composer, { onFiles: () => {} })

const png = new File(['x'], 'shot.png', { type: 'image/png' })
const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

// happy-dom's ClipboardEvent has no DataTransfer, so the event carries a minimal stand-in.
function paste(target: Element, files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, 'clipboardData', { value: { files } })
  target.dispatchEvent(event)
  return event
}

async function setup(props: Props) {
  const container = document.createElement('div')
  const root = createRoot(container)
  const render = (next: Props) => act(async () => root.render(createElement(Composer, next)))
  await render(props)
  return {
    input: container.querySelector('#input')!,
    render,
    unmount: () => act(async () => root.unmount()),
  }
}

describe('usePasteFiles', () => {
  componentMatrix(Default)

  it('takes pasted files from a focused child, and leaves plain text pastes alone', async () => {
    const onFiles = vi.fn<(files: File[]) => void>()
    const view = await setup({ onFiles })

    const withFiles = paste(view.input, [png, pdf])
    expect(onFiles).toHaveBeenCalledWith([png, pdf], withFiles)
    expect(withFiles.defaultPrevented).toBe(true)

    const text = paste(view.input, [])
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(text.defaultPrevented).toBe(false)
    await view.unmount()
  })

  it('filters by accept like a file input, and stops while disabled', async () => {
    const onFiles = vi.fn<(files: File[]) => void>()
    const view = await setup({ onFiles, options: { accept: 'image/*, .csv' } })
    paste(view.input, [png, pdf])
    expect(onFiles).toHaveBeenLastCalledWith([png], expect.anything())

    const onlyPdf = paste(view.input, [pdf])
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onlyPdf.defaultPrevented).toBe(false) // nothing matched: the paste goes through

    await view.render({ onFiles, options: { enabled: false } })
    paste(view.input, [png])
    expect(onFiles).toHaveBeenCalledTimes(1)
    await view.unmount()
  })
})
