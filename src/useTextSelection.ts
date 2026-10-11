import { useEffect, useState } from 'react'

export type TextSelection = {
  /** The selected text. */
  text: string
  /** Where the selection is on screen, in viewport coordinates, for placing a toolbar. */
  rect: DOMRect
  /** A copy of the selected range, e.g. to wrap it in a highlight. */
  range: Range
}

function read(element: Element, prev: TextSelection | null): TextSelection | null {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!element.contains(range.commonAncestorContainer)) return null
  const text = selection.toString()
  if (!text.trim()) return null
  const rect = range.getBoundingClientRect()
  if (
    prev?.text === text &&
    prev.rect.x === rect.x &&
    prev.rect.y === rect.y &&
    prev.rect.width === rect.width
  )
    return prev
  return { text, rect, range: range.cloneRange() }
}

/**
 * The text the user has selected inside an element, or `null`. Returns a
 * callback ref for the element.
 *
 * Follows mouse, touch, and keyboard selection (Shift+arrows, select all).
 * While the mouse or finger is still down it waits, so a toolbar doesn't
 * flicker during a drag, and updates on release. `null` when the selection is
 * empty, only whitespace, or not entirely inside the element.
 *
 * Use when: a floating toolbar for highlight, comment, share quote, or "Ask AI
 * about this", or a "copy quote" button.
 * Don't use when: the text is in an `<input>` or `<textarea>`; read its
 * `selectionStart` and `selectionEnd`. For a rich text editor, use the
 * editor's own selection API. `rect` doesn't follow scrolling; read
 * `range.getBoundingClientRect()` again if the page scrolls.
 *
 * @returns `[ref, selection]`. Pass `ref` to the element containing the text.
 *
 * @example
 * const [ref, selection] = useTextSelection<HTMLElement>()
 * return (
 *   <>
 *     <article ref={ref}>{children}</article>
 *     {selection && (
 *       <div style={{ position: 'fixed', top: selection.rect.top - 40, left: selection.rect.left }}>
 *         <button onClick={() => quote(selection.text)}>Quote</button>
 *       </div>
 *     )}
 *   </>
 * )
 */
export function useTextSelection<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  TextSelection | null,
] {
  const [element, setElement] = useState<T | null>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)

  useEffect(() => {
    if (!element) return
    let pressed = false
    const update = () => setSelection((prev) => read(element, prev))
    const onSelectionChange = () => {
      if (!pressed) update()
    }
    const onDown = () => {
      pressed = true
    }
    const onUp = () => {
      pressed = false
      update()
    }
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [element])

  return [setElement, selection]
}
