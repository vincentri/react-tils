// Calls onChange when a scroll container or its content changes size. Content can grow with no
// scroll event (a streamed message, an appended row), so scroll position alone isn't enough.
// Watches the container and its direct children, and picks up children added later.
export function observeContent(element: Element, onChange: () => void): () => void {
  const resize = new ResizeObserver(onChange)
  resize.observe(element)
  for (const child of element.children) resize.observe(child)
  const mutation = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node instanceof Element) resize.observe(node)
      for (const node of record.removedNodes) if (node instanceof Element) resize.unobserve(node)
    }
    onChange()
  })
  mutation.observe(element, { childList: true })
  return () => {
    resize.disconnect()
    mutation.disconnect()
  }
}
