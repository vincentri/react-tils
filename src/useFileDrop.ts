import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

/**
 * Turns an element into a drop zone for files, and reports when files are
 * dragged over it.
 *
 * `isOver` does not flicker when the pointer moves over child elements (it
 * counts enter/leave pairs). Only reacts to drags that carry files, so dragging
 * text or links inside the page is unaffected. Prevents the browser from
 * opening a file dropped on the zone. Returns a callback ref for the element.
 *
 * Use when: an upload area, an "import file" panel, or dropping images into an
 * editor.
 * Don't use when: a plain `<input type="file">` is enough; keep one anyway as
 * the keyboard and screen-reader accessible way to pick files. Filter file
 * types and sizes in `onDrop`; the browser doesn't.
 *
 * @param onDrop - Called with the dropped files. Can change every render.
 * @param options - `enabled`: accept drops while `true`. Default `true`.
 * @returns `[ref, isOver]`. Pass `ref` to the drop zone's `ref` prop.
 *
 * @example
 * const [ref, isOver] = useFileDrop((files) => upload(files.filter((f) => f.type.startsWith('image/'))))
 * return (
 *   <div ref={ref} className={isOver ? 'zone active' : 'zone'}>
 *     Drop images here, or <input type="file" accept="image/*" multiple onChange={(e) => upload([...e.target.files!])} />
 *   </div>
 * )
 */
export function useFileDrop<T extends HTMLElement = HTMLElement>(
  onDrop: (files: File[], event: DragEvent) => void,
  options: { enabled?: boolean } = {},
): [(element: T | null) => void, boolean] {
  const { enabled = true } = options
  const [element, setElement] = useState<T | null>(null)
  const [isOver, setIsOver] = useState(false)
  const onDropRef = useLatest(onDrop)

  useEffect(() => {
    if (!element || !enabled) return
    // dragenter/dragleave fire for every child; count them so isOver stays steady.
    let depth = 0
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth += 1 // not depth++: React Compiler 1.0 can't compile ++ on a captured variable
      if (depth === 1) setIsOver(true)
    }
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth -= 1
      if (depth <= 0) {
        depth = 0
        setIsOver(false)
      }
    }
    // Required for the element to accept a drop.
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDropEvent = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault() // stop the browser from opening the file
      depth = 0
      setIsOver(false)
      onDropRef.current(Array.from(event.dataTransfer?.files ?? []), event)
    }
    element.addEventListener('dragenter', onEnter)
    element.addEventListener('dragleave', onLeave)
    element.addEventListener('dragover', onOver)
    element.addEventListener('drop', onDropEvent)
    return () => {
      element.removeEventListener('dragenter', onEnter)
      element.removeEventListener('dragleave', onLeave)
      element.removeEventListener('dragover', onOver)
      element.removeEventListener('drop', onDropEvent)
      setIsOver(false)
    }
  }, [element, enabled, onDropRef])

  return [setElement, isOver]
}
