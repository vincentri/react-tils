# react-tils

[![npm](https://img.shields.io/npm/v/@vincent.ri/react-tils)](https://www.npmjs.com/package/@vincent.ri/react-tils)
[![CI](https://github.com/vincentri/react-tils/actions/workflows/ci.yml/badge.svg)](https://github.com/vincentri/react-tils/actions/workflows/ci.yml)
[![size](https://img.shields.io/badge/all%2047%20hooks-7.2%20kB-blue)](#hooks)
[![license](https://img.shields.io/npm/l/@vincent.ri/react-tils)](LICENSE)

React hooks for browser state and interaction that are correct on the first frame: they render on the server, hydrate without mismatches, clean up every listener, and work with React Compiler. Documented so AI coding agents pick the right hook and use it correctly.

**[Live demo](https://vincentri.github.io/react-tils/)** · **[llms.txt](https://vincentri.github.io/react-tils/llms.txt)** · **[Agent guide](AGENTS.md)**

```sh
npm install @vincent.ri/react-tils
```

```tsx
'use client'
import { useLocalStorage, useMediaQuery, useOnline } from '@vincent.ri/react-tils'

export function Sidebar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false)
  const online = useOnline()

  return (
    <aside data-collapsed={collapsed || !isDesktop}>
      {!online && <p>You're offline. Changes will sync later.</p>}
      <button onClick={() => setCollapsed((c) => !c)}>Toggle</button>
    </aside>
  )
}
```

## Why

The usual way to read browser state in React is `useState` plus `useEffect`. It works, but every client-side mount renders a wrong value first and corrects it a frame later. Reading `window` during render instead crashes on the server, and guessing on the server causes hydration mismatches. These bugs are easy to write and easy to miss, especially for AI agents.

- **Right on the first frame.** Hooks are built on `useSyncExternalStore`. A client-side mount shows the real value immediately; server rendering and hydration use a `serverValue` you control, with no mismatch.
- **No leaks.** Every listener, observer, and timer is removed on unmount, including under StrictMode.
- **Tested for real.** Every hook passes a server-render, hydration, and leak check on React 18, 19, and canary, plus browser tests in Chromium, Firefox, WebKit, and a Next.js app.
- **React Compiler safe.** Every hook compiles with zero bailouts, and the full test suite runs again on compiled code.
- **Small.** No dependencies, one file per hook, tree-shakeable. All 47 hooks together are 7.2 kB (brotli).
- **Made for agents.** Every hook's JSDoc says when to use it and when not to, with examples. `AGENTS.md` maps everyday tasks to hooks and lists the patterns to avoid.

## Setup for AI agents

Agents rarely use an installed library unless something points them to it. One command adds that pointer:

```sh
npx react-tils init
```

It adds one line to your `CLAUDE.md` and `AGENTS.md` (creating them if needed), plus a Cursor rule if you use Cursor, pointing the agent at `node_modules/@vincent.ri/react-tils/AGENTS.md`. Running it again changes nothing.

In our evaluation, that one line took the share of agent solutions with a wrong first frame from 15/21 (Claude Haiku) and 7/21 (Claude Sonnet) to 0/21 for both. See [Evaluation](#evaluation).

## How server rendering works

Hooks that read browser state take an optional `serverValue`: what to render on the server and during hydration, where the browser state is unknown. After hydration the hook switches to the real value. On a client-side mount, such as after navigation, there is nothing to hydrate, so the real value renders immediately.

```tsx
const isDesktop = useMediaQuery('(min-width: 1024px)', true) // assume desktop on the server
const now = useNow(1000) // null on the server, then the current time every second
```

Pick the `serverValue` most of your visitors will have, so the switch after hydration is rare. For anything that must never show a default, render it only after hydration with `useHydrated()`.

## Hooks

Import from the root or from a hook's own path; both tree-shake:

```ts
import { useMediaQuery } from '@vincent.ri/react-tils'
import { useMediaQuery } from '@vincent.ri/react-tils/useMediaQuery'
```

Every hook is documented in its type declarations, so your editor shows the full docs and examples on hover.

### Viewport and media

| Hook                                 | For                                                        | Size  |
| ------------------------------------ | ---------------------------------------------------------- | ----- |
| `useMediaQuery(query, serverValue?)` | Breakpoints, dark mode, reduced motion, pointer type in JS | 126 B |
| `useWindowSize(serverValue?)`        | Exact window width and height in pixels                    | 168 B |
| `useVisualViewport(serverValue?)`    | Keeping a bottom bar above the mobile keyboard             | 285 B |
| `useWindowScroll(serverValue?)`      | Page scroll position: back-to-top buttons, progress bars   | 169 B |
| `useScrollDirection(threshold?)`     | Hiding the header while scrolling down                     | 190 B |

### Elements

| Hook                       | For                                                         | Size  |
| -------------------------- | ----------------------------------------------------------- | ----- |
| `useElementSize({ box? })` | An element's pixel size, for canvases and charts            | 322 B |
| `useElementScroll()`       | Scroll position and edges of a scroll container             | 451 B |
| `useInView(options?)`      | Lazy loading, infinite lists, play when visible             | 252 B |
| `useStickToBottom()`       | Chats and logs that follow new messages until you scroll up | 589 B |
| `useMergedRefs(...refs)`   | Putting several refs on one element                         | 315 B |

### Storage and URL

| Hook                                    | For                                                  | Size  |
| --------------------------------------- | ---------------------------------------------------- | ----- |
| `useLocalStorage(key, serverValue)`     | State that survives reloads, synced across tabs      | 368 B |
| `useSessionStorage(key, serverValue)`   | State for this tab only                              | 370 B |
| `useHash(serverValue?)`                 | Tabs or panels linkable through the URL hash         | 159 B |
| `useBroadcastChannel(name, onMessage?)` | Telling other tabs about an event (logged out, cart) | 228 B |

### Page, device, and user

| Hook                                  | For                                                          | Size  |
| ------------------------------------- | ------------------------------------------------------------ | ----- |
| `useOnline(serverValue?)`             | Offline banners, disabling network actions                   | 112 B |
| `useNetworkInformation(serverValue?)` | Skipping autoplay on data saver or slow connections          | 228 B |
| `useDocumentVisibility(serverValue?)` | Pausing work while the tab is hidden                         | 101 B |
| `useWindowFocus(serverValue?)`        | Whether the window has focus                                 | 113 B |
| `useIdle(timeoutMs?)`                 | "Are you still there?", away status                          | 238 B |
| `usePreferredLanguages(serverValue?)` | The user's languages, for a default locale                   | 159 B |
| `usePermission(name)`                 | Showing the right button for a permission, without prompting | 319 B |
| `useGeolocation(options?)`            | The user's location, after they ask for it                   | 305 B |
| `useHydrated()`                       | Rendering something only in the browser                      | 77 B  |
| `useNow(intervalMs, serverValue?)`    | Clocks, countdowns, "5 minutes ago"                          | 153 B |

### Events and input

| Hook                                                | For                                                    | Size  |
| --------------------------------------------------- | ------------------------------------------------------ | ----- |
| `useEventListener(target, type, handler, options?)` | Any window, document, or element event                 | 274 B |
| `useClickOutside(handler, enabled?)`                | Closing menus and popovers on an outside press         | 322 B |
| `useHotkey(hotkey, handler, options?)`              | Keyboard shortcuts like `mod+k` and Escape             | 611 B |
| `useLongPress(onLongPress, options?)`               | Press and hold on touch and mouse                      | 381 B |
| `useSwipe(onSwipe, options?)`                       | Swiping between slides, swipe to dismiss               | 401 B |
| `useFileDrop(onDrop, options?)`                     | Drag-and-drop file upload areas                        | 348 B |
| `useTextSelection()`                                | Floating toolbars for selected text                    | 351 B |
| `useRovingFocus(options?)`                          | Arrow-key navigation in toolbars, menus, and tab lists | 688 B |
| `useFocusTrap(active?)`                             | Keeping focus inside a custom modal or drawer          | 512 B |

### Timers

| Hook                                               | For                                                   | Size  |
| -------------------------------------------------- | ----------------------------------------------------- | ----- |
| `useInterval(callback, delayMs \| null, options?)` | Polling, carousels; can pause while the tab is hidden | 260 B |
| `useTimeout(callback, delayMs \| null)`            | Auto-dismissing toasts, "Saved" labels                | 204 B |
| `useDebouncedCallback(fn, delayMs, options?)`      | Search as you type, autosave                          | 296 B |
| `useDebouncedValue(value, delayMs)`                | A debounced copy of state, such as a query to fetch   | 99 B  |
| `useAnimationFrame(callback, active?)`             | Canvas drawing and game loops                         | 190 B |

### Browser APIs

| Hook                                  | For                                             | Size  |
| ------------------------------------- | ----------------------------------------------- | ----- |
| `useCopyToClipboard(resetMs?)`        | Copy buttons with a "Copied!" label             | 177 B |
| `useShare()`                          | The native share sheet                          | 196 B |
| `useFullscreen()`                     | Fullscreen for players, viewers, and slideshows | 292 B |
| `useWakeLock(enabled?)`               | Keeping the screen on                           | 313 B |
| `useUserMedia(constraints, options?)` | Camera and microphone                           | 313 B |
| `useScript(src, options?)`            | Loading a third-party script once, on demand    | 456 B |
| `useScrollLock(locked?)`              | Stopping the page scrolling behind a modal      | 270 B |
| `useBeforeUnload(when?)`              | Warning before leaving with unsaved changes     | 105 B |

### Component helpers

| Hook                                                   | For                                                   | Size  |
| ------------------------------------------------------ | ----------------------------------------------------- | ----- |
| `useControllableState(value, defaultValue, onChange?)` | Components that work both controlled and uncontrolled | 216 B |

Coming from react-use, ahooks, usehooks-ts, or similar? [`AGENTS.md`](AGENTS.md#coming-from-another-library) maps their hook names to these.

## Testing your own hooks

The checks every hook here passes are exported, so you can run them on your own hooks and components with Vitest (in a `happy-dom` or `jsdom` environment):

```ts
import { describe } from 'vitest'
import { componentMatrix, hookMatrix } from '@vincent.ri/react-tils/testing'
import { Sidebar } from './Sidebar'
import { useScrollY } from './useScrollY'

describe('useScrollY', () => {
  hookMatrix(() => useScrollY())
})

describe('Sidebar', () => {
  componentMatrix(Sidebar)
})
```

They fail if the code touches the DOM during server render, causes a hydration mismatch, or leaks a listener after a StrictMode mount and unmount.

## Compatibility

- React 18 and 19, including React Compiler.
- Tested in Next.js (App Router) and Vite apps, with npm, pnpm, yarn, and bun. Any bundler with ESM support works.
- TypeScript with `moduleResolution` `bundler` or `nodenext`.
- ESM only. Vitest works out of the box; Jest needs its ESM mode, or `transformIgnorePatterns` set so it transforms `@vincent.ri/react-tils`.
- Not in scope: data fetching, state management, and generic helpers like `usePrevious`.

## Evaluation

Headless Claude Code agents were given 7 everyday tasks in a Next.js project (responsive sidebar, window width, theme toggle, offline banner, pause when hidden, dark mode, reduced motion), 3 runs each. Prompts were normal requests and never mentioned server rendering.

| Agent         | Wrong first frame, no library | With the library and `init` pointer |
| ------------- | ----------------------------- | ----------------------------------- |
| Claude Haiku  | 15/21                         | **0/21**                            |
| Claude Sonnet | 7/21                          | **0/21**                            |

Without the pointer, agents used the installed library in only 2 of 42 runs. Hard failures such as crashes and hydration mismatches were rare either way; the common bug is the wrong first frame. The evaluation ran on an earlier version with fewer hooks, with Claude models only. Method, caveats, and how to reproduce it are in [CONTRIBUTING.md](CONTRIBUTING.md#evaluation).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development, the test setup, and releasing.

## License

[MIT](LICENSE)
