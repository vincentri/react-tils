import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

export type PasteFilesOptions = {
  /** Listen while `true`. Default `true`. */
  enabled?: boolean
  /** Which files to take, like an `<input type="file">` `accept`: `'image/*'`, `'application/pdf'`, `'.csv'`. Default: all files. */
  accept?: string
}

function matches(file: File, accept: string | undefined): boolean {
  if (!accept) return true
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase()
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

/**
 * Calls `onFiles` when the user pastes files, such as a screenshot, while
 * focus is inside an element. Returns a callback ref for the element, e.g. a
 * chat input or its wrapper.
 *
 * Only pastes that contain matching files are taken: their default is
 * prevented so the file name isn't pasted as text. Plain text pastes are left
 * alone.
 *
 * Use when: pasting images into a chat, a comment box, an editor, or an
 * upload area.
 * Don't use when: you want drag and drop; use `useFileDrop` (they work well
 * together). Keep an `<input type="file">` too, for users who don't paste.
 *
 * Other libraries call this `usePaste`, `useClipboardFiles`.
 *
 * @param onFiles - Called with the pasted files and the event. Can change every render.
 * @param options - `enabled`, `accept`. Optional.
 * @returns A callback ref. Pass it to the element that contains the focused input.
 *
 * @example
 * const ref = usePasteFiles((files) => attach(files), { accept: 'image/*' })
 * return <textarea ref={ref} placeholder="Message, or paste a screenshot" />
 */
export function usePasteFiles<T extends HTMLElement = HTMLElement>(
  onFiles: (files: File[], event: ClipboardEvent) => void,
  options: PasteFilesOptions = {},
): (element: T | null) => void {
  const { enabled = true, accept } = options
  const [element, setElement] = useState<T | null>(null)
  const onFilesRef = useLatest(onFiles)

  useEffect(() => {
    if (!element || !enabled) return
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        matches(file, accept),
      )
      if (files.length === 0) return
      event.preventDefault()
      onFilesRef.current(files, event)
    }
    element.addEventListener('paste', onPaste)
    return () => element.removeEventListener('paste', onPaste)
  }, [element, enabled, accept, onFilesRef])

  return setElement
}
