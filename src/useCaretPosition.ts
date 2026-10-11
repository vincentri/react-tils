import { useEffect, useState } from 'react'

export type CaretPosition = {
  /** Top of the caret line, in viewport pixels. Use with `position: fixed`. */
  top: number
  /** Left of the caret, in viewport pixels. */
  left: number
  /** Line height at the caret, in pixels. Place a popup at `top + height`. */
  height: number
}

// Styles that affect where text wraps and how wide each character is.
const COPIED = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textAlign',
  'textIndent',
  'textTransform',
  'tabSize',
  'direction',
] as const

function measure(element: HTMLTextAreaElement | HTMLInputElement): CaretPosition {
  const style = getComputedStyle(element)
  // A hidden copy of the field with the text up to the caret, then a marker where the caret is.
  const mirror = document.createElement('div')
  for (const property of COPIED) mirror.style[property] = style[property]
  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    top: '0',
    left: '-9999px',
    whiteSpace: element instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre',
    overflowWrap: 'break-word',
  })
  const caret = element.selectionStart ?? element.value.length
  mirror.textContent = element.value.slice(0, caret)
  const marker = document.createElement('span')
  marker.textContent = element.value.slice(caret) || '.'
  mirror.append(marker)
  document.body.append(mirror)

  const rect = element.getBoundingClientRect()
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
  const position = {
    top: rect.top + Number.parseFloat(style.borderTopWidth) + marker.offsetTop - element.scrollTop,
    left:
      rect.left + Number.parseFloat(style.borderLeftWidth) + marker.offsetLeft - element.scrollLeft,
    height: lineHeight,
  }
  mirror.remove()
  return position
}

const same = (a: CaretPosition | null, b: CaretPosition | null) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * The caret's position on screen in a `<textarea>` or text `<input>`, or
 * `null` while the field isn't focused. Returns a callback ref for the field.
 *
 * Browsers don't expose caret coordinates, so this measures a hidden copy of
 * the field's text and styles. Updates on typing, clicks, arrow keys,
 * selection changes, and scrolling inside the field or the page, at most once
 * per frame. Coordinates are in viewport pixels, for a `position: fixed` popup.
 * Safe with controlled fields: it never updates state during their events.
 *
 * Use when: placing an `@mention`, `/command`, emoji, or autocomplete popup
 * next to the caret, like in chat and comment inputs.
 * Don't use when: the popup can sit below the whole field; position it from
 * the field's own box. For rich text editors, use the editor's selection
 * API; for text selected elsewhere on the page, use `useTextSelection`.
 *
 * Other libraries call this `useCaretCoordinates`, `textarea-caret`.
 *
 * @returns `[ref, position]`. Pass `ref` to the textarea or input.
 *
 * @example
 * const [ref, caret] = useCaretPosition()
 * const [text, setText] = useState('')
 * const mentioning = /@\w*$/.test(text)
 * return (
 *   <>
 *     <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} />
 *     {mentioning && caret && (
 *       <ul style={{ position: 'fixed', top: caret.top + caret.height, left: caret.left }}>…</ul>
 *     )}
 *   </>
 * )
 */
export function useCaretPosition<
  T extends HTMLTextAreaElement | HTMLInputElement = HTMLTextAreaElement,
>(): [(element: T | null) => void, CaretPosition | null] {
  const [element, setElement] = useState<T | null>(null)
  const [position, setPosition] = useState<CaretPosition | null>(null)

  useEffect(() => {
    if (!element) return
    // Measured on the next frame, never inside the event: a state update during `input` would
    // re-render before React's own onChange and reset a controlled textarea, losing the keystroke.
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = document.activeElement === element ? measure(element) : null
        setPosition((prev) => (same(prev, next) ? prev : next))
      })
    }
    const targets = [
      [element, ['input', 'focus', 'blur', 'keyup', 'pointerup', 'scroll']],
      [document, ['selectionchange']],
      [window, ['resize', 'scroll']],
    ] as const
    for (const [target, types] of targets)
      for (const type of types) target.addEventListener(type, update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      for (const [target, types] of targets)
        for (const type of types) target.removeEventListener(type, update)
    }
  }, [element])

  return [setElement, position]
}
