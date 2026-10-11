# react-tils — guide for AI coding agents

React hooks for browser state. Every hook renders on the server, hydrates with no mismatch, cleans up every listener, and works with React Compiler. Full docs and examples are in the JSDoc of each `dist/*.d.ts` file.

## Pick a hook

| Task                                                                                   | Use                                                                                                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| JS logic depends on viewport size, color scheme, reduced motion, pointer, orientation  | `useMediaQuery(query, serverValue?)`                                                                                         |
| Exact window width/height in pixels (canvas, virtualization, popover placement)        | `useWindowSize(serverValue?)`                                                                                                |
| Show offline state, disable network actions                                            | `useOnline(serverValue?)`                                                                                                    |
| Pause polling/video/timers while the tab is hidden, refresh on return                  | `useDocumentVisibility(serverValue?)`                                                                                        |
| Dark mode / reduced motion in JS                                                       | `useMediaQuery('(prefers-color-scheme: dark)')`                                                                              |
| Keep state for this tab only (form step, dismissed banner this visit)                  | `useSessionStorage(key, serverValue)`                                                                                        |
| Scroll position (back-to-top button, hide header on scroll, progress bar)              | `useWindowScroll(serverValue?)`                                                                                              |
| Is an element on screen (lazy load, infinite list, play when visible)                  | `useInView(options?)`                                                                                                        |
| An element's pixel size (canvas/chart sized to its container)                          | `useElementSize({ box? })`                                                                                                   |
| Only styles depend on an element's size                                                | No hook. Use CSS container queries.                                                                                          |
| The window is visible but the user is in another window (pause, mark as read)          | `useWindowFocus(serverValue?)`                                                                                               |
| Render something only in the browser (local time, client-only widget)                  | `useHydrated()` instead of `useState(false)` + `useEffect`                                                                   |
| User's language for a default locale or `Intl` formatting                              | `usePreferredLanguages(serverValue?)` (pass the parsed `Accept-Language` header as `serverValue`)                            |
| Show the right button for a permission (granted / denied / prompt) without prompting   | `usePermission(name)`                                                                                                        |
| User inactive for a while ("Are you still there?", set status to away)                 | `useIdle(timeoutMs?)`                                                                                                        |
| User's location after they ask for it                                                  | `useGeolocation({ enabled })`; keep `enabled` false until a click                                                            |
| Rough location (country, city)                                                         | No hook. Use IP-based location on the server; no prompt.                                                                     |
| Close a dropdown/popover/menu when the user presses outside it                         | `useClickOutside(handler, enabled?)` on a wrapper around the menu and its button, or native `<dialog>` / `popover`           |
| Keyboard shortcut (`mod+k` palette, Escape to close, `/` to search, `g i` sequences)   | `useHotkey(hotkey, handler, options?)`                                                                                       |
| "Copy" button with a "Copied!" label                                                   | `useCopyToClipboard(resetMs?)`                                                                                               |
| Stop the page scrolling behind a modal or drawer                                       | `useScrollLock(locked)`                                                                                                      |
| Warn before leaving with unsaved changes                                               | `useBeforeUnload(when)` (does not catch client-side router navigation)                                                       |
| Any other window/document/element event                                                | `useEventListener(target, type, handler, options?)`                                                                          |
| Polling, countdown, clock, carousel                                                    | `useInterval(callback, delayMs \| null, { pauseWhenHidden? })`                                                               |
| Auto-dismiss a toast, hide "Saved" after 2s, delay before showing a spinner            | `useTimeout(callback, delayMs \| null)` → `restart`                                                                          |
| Reusable component, controlled or uncontrolled (`value` / `defaultValue` / `onChange`) | `useControllableState(value, defaultValue, onChange?)`; never copy a prop into state                                         |
| Floating toolbar for selected text (highlight, quote, "Ask AI about this")             | `useTextSelection()` → `[ref, selection]`                                                                                    |
| Render the current time (clock, countdown, "5 minutes ago")                            | `useNow(intervalMs, serverValue?)`; never `new Date()` in render                                                             |
| Canvas drawing, game loop, per-frame updates                                           | `useAnimationFrame(callback, active?)`; for UI animation use CSS or `element.animate()`                                      |
| Tabs or panels linkable through the URL hash (`/settings#billing`)                     | `useHash(serverValue?)` → `[hash, setHash]`                                                                                  |
| Tabs, search, filters, sort, or page number kept in the URL query (`?tab=billing`)     | `useSearchParam(name, serverValue?)` → `[value, set]`; `set(v, { push: true })` for a Back step; skip if your router has one |
| One element needs several refs (forwarded `ref`, `useInView`, `useElementSize`)        | `useMergedRefs(...refs)`                                                                                                     |
| Third-party SDK from a URL (Stripe.js, Maps, chat widget)                              | `useScript(src, { enabled?, attributes? })`; prefer an npm package with `import()` if one exists                             |
| Keep the screen on (recipe, presentation, directions, ticket QR)                       | `useWakeLock(enabled)`                                                                                                       |
| Fullscreen button for a player, viewer, slideshow, or game                             | `useFullscreen()`                                                                                                            |
| Native "Share" sheet                                                                   | `useShare()`, with `useCopyToClipboard` as the fallback                                                                      |
| Camera or microphone (video preview, QR scan, recording)                               | `useUserMedia(constraints, { enabled? })`; stops tracks on unmount                                                           |
| Take a photo on a phone without a live preview                                         | No hook. `<input type="file" accept="image/*" capture>`                                                                      |
| Tell other tabs about an event (logged out, cart updated)                              | `useBroadcastChannel(name, onMessage?)` → `post`                                                                             |
| Drag-and-drop file upload area                                                         | `useFileDrop(onDrop, { enabled? })` → `[ref, isOver]`; keep an `<input type="file">` too                                     |
| Press-and-hold on touch (select item, preview)                                         | `useLongPress(onLongPress, { delayMs?, moveTolerance? })`; spread onto the element                                           |
| Search-as-you-type, autosave, validate after the user pauses                           | `useDebouncedCallback(fn, delayMs, { maxWaitMs? })`; for expensive rendering use `useDeferredValue`                          |
| Debounced copy of state (a query to fetch with), not a debounced handler               | `useDebouncedValue(value, delayMs)`                                                                                          |
| Run during a burst at most every N ms (live results, send cursor/typing, slider save)  | `useThrottledCallback(fn, intervalMs)`; to run once after the user stops, use `useDebouncedCallback`                         |
| The previous value of a prop or state (price ▲/▼, slide direction, "changed from X")   | `usePrevious(value)`; never a ref read during render                                                                         |
| Scroll position or edges of a scroll container (fade shadows, "read to the end")       | `useElementScroll()` → `[ref, { y, atTop, atBottom, … }]`; for the page use `useWindowScroll`                                |
| Chat, AI chat, or log that follows new messages until the user scrolls up              | `useStickToBottom()` → `[ref, { atBottom, scrollToBottom }]`                                                                 |
| Highlight the current section in a table of contents or docs sidebar                   | `useScrollSpy(ids, { offset? })` → active id                                                                                 |
| Chat input or comment box that grows with its text                                     | `useAutosizeTextarea({ maxRows? })` → `ref`; set the minimum with `rows`                                                     |
| Paste screenshots or files into a chat, editor, or upload area                         | `usePasteFiles(onFiles, { accept? })` → `ref`; pairs with `useFileDrop`                                                      |
| Style a sticky header once it sticks (shadow, border, smaller)                         | `useIsStuck()` → `[ref, stuck]`; the element needs `position: sticky`                                                        |
| Refresh stale data when the user comes back with the Back button                       | `usePageRestore(callback)` (back/forward cache)                                                                              |
| Resizable panel, splitter, custom slider, dragging on a canvas                         | `useDrag(onDrag, { threshold? })` → `ref`; add CSS `touch-action: none`                                                      |
| Spotlight, tooltip, crosshair, or magnifier at the pointer over an element             | `usePointerPosition()` → `[ref, { x, y } \| null]`; page-wide cursor: `useEventListener` + a CSS variable                    |
| Tell screen reader users "Copied", "Added to cart", "3 results"                        | `useAnnounce()` → `announce(message, politeness?)`                                                                           |
| `@mention` or `/command` popup at the caret in a textarea                              | `useCaretPosition()` → `[ref, { top, left, height } \| null]`                                                                |
| Record a voice note, voice input for AI chat, or a video message                       | `useMediaRecorder(stream)` with `useUserMedia`; picks a format the browser supports                                          |
| "Read aloud" button for AI answers or articles                                         | `useSpeechSynthesis()` → `{ voices, speaking, speak, cancel }`                                                               |
| "New version available, reload" banner in a PWA                                        | `useServiceWorkerUpdate({ checkIntervalMs? })`; the worker must handle `SKIP_WAITING`                                        |
| Reading-progress bar for an article                                                    | `useScrollProgress()` → `[ref, progress]` from 0 to 1                                                                        |
| A preference the server must know on the first request (theme, locale, currency)       | `useCookie(name, serverValue)`; pass the request's cookie as `serverValue`                                                   |
| Dictation: speech to text in a search box or chat input                                | `useSpeechRecognition({ lang?, continuous? })`; Chrome, Edge, Safari only                                                    |
| Tilt effects, a compass, steering by tilting the phone                                 | `useDeviceOrientation()`; on iOS call `requestPermission()` from a tap                                                       |
| Arrow-key navigation in a toolbar, menu, tab list, or listbox (one Tab stop)           | `useRovingFocus({ orientation?, loop? })`; radio groups and `<select>` do it natively                                        |
| Hide the header on scroll down, show it on scroll up                                   | `useScrollDirection(threshold?)`                                                                                             |
| Keep keyboard focus inside a custom modal or drawer                                    | `useFocusTrap(active)`; prefer `<dialog>` with `showModal()`                                                                 |
| Swipe between slides, swipe to dismiss                                                 | `useSwipe(onSwipe, { threshold? })`, plus CSS `touch-action`                                                                 |
| Keep a bottom bar or chat input above the mobile keyboard                              | `useVisualViewport()` → `bottomInset`                                                                                        |
| Skip autoplay or prefetch on data saver or slow connections                            | `useNetworkInformation()` (Chromium only; unknown elsewhere)                                                                 |
| Dark mode toggle without a flash of the wrong theme                                    | No hook can do it: the first paint happens before React. Use an inline script in `<head>` (e.g. `next-themes`)               |
| Only styling changes with the viewport                                                 | No hook. Use CSS `@media`.                                                                                                   |
| Persist preferences, drafts, or UI state across reloads and tabs                       | `useLocalStorage(key, serverValue)`                                                                                          |
| Store tokens or personal data                                                          | No hook. Never localStorage; use httpOnly cookies.                                                                           |
| Store large data (over ~1 MB)                                                          | No hook. Use IndexedDB.                                                                                                      |

Import from the root or from the hook's own path. Both tree-shake.

```ts
import { useMediaQuery } from '@vincent.ri/react-tils'
import { useMediaQuery } from '@vincent.ri/react-tils/useMediaQuery'
```

## Coming from another library

Names from react-use, ahooks, usehooks-ts, @uidotdev/usehooks, MUI, and Mantine, and the react-tils hook to use instead. Check the API in its JSDoc: arguments differ.

| Their name                                                        | Use                      |
| ----------------------------------------------------------------- | ------------------------ |
| `useAutoScroll`, `useChatScroll`                                  | `useStickToBottom`       |
| `useActiveSection`, `useScrollspy`                                | `useScrollSpy`           |
| `useTextareaAutosize`, `useAutoResize`, `react-textarea-autosize` | `useAutosizeTextarea`    |
| `usePaste`, `useClipboardFiles`                                   | `usePasteFiles`          |
| `useSticky`, `useStickyFixed`                                     | `useIsStuck`             |
| `useBfcache`, `usePageShow`                                       | `usePageRestore`         |
| `useDraggable`, `useGesture` (`onDrag`), `usePointerDrag`         | `useDrag`                |
| `useAnnouncer`, `useLiveAnnouncer`, `LiveAnnouncer`               | `useAnnounce`            |
| `useCaretCoordinates`, `textarea-caret`                           | `useCaretPosition`       |
| `useRecorder`, `useAudioRecorder`, `react-media-recorder`         | `useMediaRecorder`       |
| `useSpeech`, `useTextToSpeech`, `react-speech-kit`                | `useSpeechSynthesis`     |
| `useRegisterSW`, `useServiceWorker`                               | `useServiceWorkerUpdate` |
| `useReadingProgress`, `useScrollPercentage`                       | `useScrollProgress`      |
| `useCookies` (react-cookie), `useCookieState`                     | `useCookie`              |
| `useSpeechToText`, `react-speech-recognition`, `useVoice`         | `useSpeechRecognition`   |
| `useOrientation` (react-use), `useDeviceMotion`, `useGyroscope`   | `useDeviceOrientation`   |
| `useMouse` (react-use), `useMousePosition`, `usePointer`          | `usePointerPosition`     |
| `useClickAway`, `useOnClickOutside`                               | `useClickOutside`        |
| `useControlled`, `useUncontrolled`, `useControllableValue`        | `useControllableState`   |
| `useDebounce`, `useDebounceValue`                                 | `useDebouncedValue`      |
| `useDebounceCallback`, `useDebounceFn`                            | `useDebouncedCallback`   |
| `useThrottle`, `useThrottleFn`, `useThrottleCallback`             | `useThrottledCallback`   |
| `useQueryState` (nuqs), `useUrlState`, `useQueryParam`            | `useSearchParam`         |
| `usePreviousDistinct`                                             | `usePrevious`            |
| `useExternal`                                                     | `useScript`              |
| `useIntersection`, `useIntersectionObserver`, `useInViewport`     | `useInView`              |
| `useIsClient`, `useMounted`                                       | `useHydrated`            |
| `useKey`, `useKeyPress`, `useHotkeys`                             | `useHotkey`              |
| `useLocalStorageState`                                            | `useLocalStorage`        |
| `useLockBodyScroll`                                               | `useScrollLock`          |
| `useMeasure`, `useSize`, `useResizeObserver`                      | `useElementSize`         |
| `useMedia`, `useBreakpoint`, `useResponsive`                      | `useMediaQuery`          |
| `useMergeRefs`, `useForkRef`, `mergeRefs`                         | `useMergedRefs`          |
| `useNetworkState`, `useNetwork`                                   | `useOnline`              |
| `usePageVisibility`                                               | `useDocumentVisibility`  |
| `useRafLoop`                                                      | `useAnimationFrame`      |
| `useRovingTabIndex`                                               | `useRovingFocus`         |
| `useScroll`                                                       | `useElementScroll`       |
| `useSessionStorageState`                                          | `useSessionStorage`      |
| `useTimeoutFn`                                                    | `useTimeout`             |

## Do not write these patterns

These are the bugs this library exists to prevent. If you see them in user code, replace them with a hook from the table above.

```tsx
// ❌ Reads window during render: crashes on the server.
const isWide = window.innerWidth > 768

// ❌ Different value on server and client: hydration mismatch.
const [isWide] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768)

// ❌ useEffect + useState for an external store: one wrong frame after
// hydration, and components can disagree during concurrent rendering.
const [isWide, setIsWide] = useState(false)
useEffect(() => {
  const mql = window.matchMedia('(min-width: 768px)')
  setIsWide(mql.matches)
  mql.addEventListener('change', (e) => setIsWide(e.matches))
  // ❌ and no cleanup: leaks a listener on every mount
}, [])

// ❌ "mounted" flag: renders false first on every client-side mount (a flash).
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

// ❌ Prop copied into state: goes stale when the prop changes, or flickers when
// "fixed" with a sync effect. Use useControllableState, or derive during render.
const [open, setOpen] = useState(props.open)
useEffect(() => setOpen(props.open), [props.open])

// ❌ Server and client clocks differ: hydration mismatch.
return <time>{new Date().toLocaleTimeString()}</time>

// ❌ Ref read during render: stale under the React Compiler and concurrent
// rendering, and equal to the current value after any unrelated re-render.
const ref = useRef(value)
useEffect(() => {
  ref.current = value
})
const previous = ref.current

// ❌ Reads the URL during render: crashes on the server, mismatches on hydration.
const tab = new URLSearchParams(location.search).get('tab')

// ✅
const isWide = useMediaQuery('(min-width: 768px)')
const hydrated = useHydrated()
const now = useNow(1000) // null until hydrated
const previous = usePrevious(value)
const [tab, setTab] = useSearchParam('tab', serverTab)
```

## Writing your own hook

No hook fits? Write one with `useSyncExternalStore` and a server snapshot, then prove it with the same test matrix this library uses:

```ts
// useScrollY.test.ts (vitest, happy-dom or jsdom environment)
import { describe } from 'vitest'
import { hookMatrix } from '@vincent.ri/react-tils/testing'
import { useScrollY } from './useScrollY'

describe('useScrollY', () => {
  hookMatrix(() => useScrollY())
})
```

`hookMatrix` fails if the hook touches the DOM during server render, causes a hydration mismatch, or leaks a listener under StrictMode. Run it before you say the hook is done. For a whole component, use `componentMatrix(MyComponent)` from the same entry.

## API rules

Every hook follows these, so you can guess a call without looking it up:

- Hook name = file name = export name (`useMediaQuery` lives in `@vincent.ri/react-tils/useMediaQuery`).
- Hooks that wrap a DOM API take its arguments in the same order: `useEventListener(target, type, handler, options)` mirrors `addEventListener`.
- Otherwise: required arguments first, then one optional last argument, either `serverValue` or an options object. No overloads.
- The value used on the server and during hydration is always named `serverValue`.
- `'window'` and `'document'` are passed as strings, so the call is safe during server render.
- Hooks return a plain value, not an object, unless they return more than one thing.
