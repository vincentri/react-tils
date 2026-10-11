# react-tils

React hooks for browser state, built for AI coding agents. Agents writing this code themselves often show the wrong value on the first frame. With this library and one line of setup, they don't.

| Agent (7 browser-state tasks × 3 runs) | Wrong first frame, no library | Wrong first frame, with library |
| -------------------------------------- | ----------------------------- | ------------------------------- |
| Claude Haiku                           | 15/21                         | **0/21**                        |
| Claude Sonnet                          | 7/21                          | **0/21**                        |

See [Evaluation](#evaluation) for the method and caveats.

## Setup for AI agents

Install, then add one line so your agent reads the guide. Without it, agents almost never use an installed library (2 of 42 runs in the evaluation).

```sh
npm install react-tils
npx react-tils init   # adds the pointer line to CLAUDE.md / AGENTS.md, and a Cursor rule if .cursor/ exists
```

`AGENTS.md` covers which hook fits each task, the patterns to replace, how to verify a custom hook, and the API rules.

ESM only. Works with any bundler, Next.js, and Vitest. Jest needs its ESM mode, or `transformIgnorePatterns` set so it transforms `react-tils`.

## Why

- **Correct first frame.** Built on `useSyncExternalStore`: a client-side mount renders the real value immediately, and hydration renders `serverValue` with no mismatch.
- **Made for agents.** Full JSDoc with "Use when / Don't use when" and examples in every `.d.ts`, and an API agents can guess. CI fails if any hook is missing docs.
- **Verify any hook or component.** `hookMatrix` and `componentMatrix` from `react-tils/testing` run the same checks on your own code, so an agent can prove what it just wrote is safe.
- **Proven.** CI runs every hook through the same checks against React 18, 19, and canary.
- **React Compiler safe.** Every hook compiles with React Compiler with zero bailouts, and CI runs all unit tests and the browser tests again on compiled code: the library, the demo app, and a Next.js app.
- **Small.** Zero dependencies, one file per hook, 7.22 kB for everything, size budget enforced in CI.

## Hooks

### Browser state

| Hook                                                                                 | Size (brotli) |
| ------------------------------------------------------------------------------------ | ------------- |
| `useDocumentVisibility(serverValue = 'visible')`                                     | 101 B         |
| `useElementSize({ box? })` → `[ref, { width, height }]`                              | 322 B         |
| `useElementScroll()` → `[ref, { x, y, atTop, atBottom, atLeft, atRight }]`           | 451 B         |
| `useGeolocation({ enabled?, enableHighAccuracy?, maximumAge?, timeout? })`           | 305 B         |
| `useHash(serverValue = '')` → `[hash, setHash]`                                      | 159 B         |
| `useHydrated()`                                                                      | 77 B          |
| `useIdle(timeoutMs = 60_000)`                                                        | 238 B         |
| `useInView({ rootMargin?, threshold?, once? })` → `[ref, inView]`                    | 252 B         |
| `useLocalStorage(key, serverValue)`                                                  | 368 B         |
| `useMediaQuery(query, serverValue = false)`                                          | 126 B         |
| `useNetworkInformation(serverValue?)` → `{ saveData, effectiveType, downlink, rtt }` | 228 B         |
| `useNow(intervalMs, serverValue = null)` → timestamp                                 | 153 B         |
| `useOnline(serverValue = true)`                                                      | 112 B         |
| `usePermission(name)`                                                                | 319 B         |
| `usePreferredLanguages(serverValue = ['en'])`                                        | 159 B         |
| `useScrollDirection(threshold = 10)` → `'up' \| 'down'`                              | 190 B         |
| `useSessionStorage(key, serverValue)`                                                | 370 B         |
| `useVisualViewport(serverValue?)` → `{ width, height, bottomInset, … }`              | 285 B         |
| `useWindowFocus(serverValue = true)`                                                 | 113 B         |
| `useWindowScroll(serverValue?)`                                                      | 169 B         |
| `useWindowSize(serverValue?)`                                                        | 168 B         |

### Events and interaction

| Hook                                                                                                 | Size (brotli) |
| ---------------------------------------------------------------------------------------------------- | ------------- |
| `useBeforeUnload(when = true)`                                                                       | 105 B         |
| `useAnimationFrame(callback, active = true)`                                                         | 190 B         |
| `useBroadcastChannel(name, onMessage?)` → `post`                                                     | 228 B         |
| `useClickOutside(handler, enabled = true)` → `ref`                                                   | 322 B         |
| `useControllableState(value, defaultValue, onChange?)` → `[value, setValue]`                         | 216 B         |
| `useCopyToClipboard(resetMs = 2000)` → `[copy, copied]`                                              | 177 B         |
| `useDebouncedCallback(fn, delayMs, { maxWaitMs? })` → debounced fn with `cancel`, `flush`, `pending` | 296 B         |
| `useDebouncedValue(value, delayMs)`                                                                  | 99 B          |
| `useEventListener(target, type, handler, options?)`                                                  | 274 B         |
| `useFileDrop(onDrop, { enabled? })` → `[ref, isOver]`                                                | 348 B         |
| `useFocusTrap(active = true)` → `ref`                                                                | 512 B         |
| `useFullscreen()` → `[ref, { supported, active, enter, exit, toggle }]`                              | 292 B         |
| `useHotkey(hotkey, handler, { enabled?, preventDefault?, enableInInputs? })`                         | 611 B         |
| `useInterval(callback, delayMs \| null, { pauseWhenHidden? })`                                       | 260 B         |
| `useLongPress(onLongPress, { delayMs?, moveTolerance? })` → handlers                                 | 381 B         |
| `useMergedRefs(...refs)` → `ref`                                                                     | 315 B         |
| `useRovingFocus({ orientation?, loop?, selector? })` → `ref`                                         | 688 B         |
| `useScript(src, { enabled?, attributes? })` → status                                                 | 456 B         |
| `useScrollLock(locked = true)`                                                                       | 270 B         |
| `useShare()` → `{ supported, share }`                                                                | 196 B         |
| `useStickToBottom()` → `[ref, { atBottom, scrollToBottom }]`                                         | 589 B         |
| `useSwipe(onSwipe, { threshold?, maxDurationMs? })` → `ref`                                          | 401 B         |
| `useTextSelection()` → `[ref, { text, rect, range } \| null]`                                        | 351 B         |
| `useTimeout(callback, delayMs \| null)` → `restart`                                                  | 204 B         |
| `useUserMedia(constraints, { enabled? })` → `{ stream, error, loading }`                             | 313 B         |
| `useWakeLock(enabled = true)` → `{ supported, active }`                                              | 313 B         |

All 47 together: 7.22 kB. Hooks share internals, so importing several costs less than the sum.

## Demo

Live at **https://vincentri.github.io/react-tils/**, with the hook reference for agents at [`llms.txt`](https://vincentri.github.io/react-tils/llms.txt).

Every hook has a live card in `demo/`, a Vite + React app that is server-rendered at build time and hydrated in the browser, like an SSR app. It deploys to GitHub Pages on every push to `main` (`.github/workflows/demo.yml`; enable Pages with source "GitHub Actions" once).

```sh
pnpm demo          # dev server
pnpm demo:build    # prerendered static site in demo/dist, plus demo/dist/llms.txt
```

The site also serves `llms.txt`: every hook's signature, import, and docs, generated from the built type declarations so it can't drift from the package.

## End-to-end tests

`e2e/` runs the built demo in Chromium, Firefox, and WebKit (Safari) with Playwright: real viewport changes, color scheme, scrolling, ResizeObserver, IntersectionObserver, offline mode, reloads, a second tab, locale, geolocation and permissions, keyboard shortcuts, clipboard, scroll lock, `beforeunload` dialogs, fullscreen, messages between tabs, file drops, long press, and a fake camera. Every test also fails on any console error, which includes React hydration mismatches.

```sh
pnpm exec playwright install chromium firefox webkit   # once
pnpm e2e
```

`e2e-next/` runs `examples/nextjs`, a Next.js App Router app, and checks the core claim directly: after a client-side navigation, a `react-tils` component shows the real window width from its first frame, while a hand-written `useEffect` version on the same page shows `0` first.

Not covered by e2e (headless browsers can't drive them): tab visibility, window focus, wake lock, and the share sheet. Unit tests cover their logic.

## Install test

`pnpm test:install` packs the real tarball and installs it into fresh projects outside the repo, the way users get it:

- the tarball has `dist`, types, `AGENTS.md`, and the CLI, and no source or tests;
- npm with React 19, pnpm with React 18 (strict, so an undeclared dependency fails), and yarn and bun when installed: a server render using the root entry and a per-hook entry, with `react-tils/internal/*` blocked;
- TypeScript with `moduleResolution` `bundler` and `nodenext`, including `@ts-expect-error` lines that fail if the types were `any`;
- `npx react-tils init` from the installed package;
- a Vite app compiled with React Compiler: production build, compared against a build without the compiler to confirm it was compiled, then run in Chromium.

## Test matrix

Every hook must pass:

| Check                                                | Catches                                |
| ---------------------------------------------------- | -------------------------------------- |
| Server render with no `window`/`document`            | hooks that touch the DOM during render |
| Hydration with no recoverable error or console error | server/client markup mismatch          |
| StrictMode mount + unmount removes every listener    | leaked subscriptions                   |

### React Compiler

`pnpm test:compiler` (part of `pnpm check`) compiles the library with React Compiler, using oxc's Rust port (`oxc-transform-react`) set to fail on any function it can't compile, and runs all unit tests on the compiled code. `scripts/compiler-report.ts` then checks every hook was compiled rather than skipped, and that a component breaking the Rules of React is rejected, so a pass can't mean the strict setting was ignored. `pnpm e2e:compiler` runs the browser tests with the demo and the library compiled, and with the Next.js app compiled by Next's Rust compiler while it uses the published, uncompiled `dist`.

Test components themselves stay uncompiled: they write hook values to outer variables during render so the tests can read them, which the compiler rightly rejects.

## Evaluation

Headless Claude Code agents were given 7 tasks in a Next.js-shaped project: responsive sidebar, window width, persisted theme toggle, offline banner, pause when tab hidden, system dark mode, reduced motion. Prompts are normal requests and never mention SSR. Each task ran 3 times per model and setup. Every solution was scored with the same checks as `react-tils/testing`, under each client state the task covers (e.g. mobile and desktop viewport):

- **Hard failures:** server crash, hydration mismatch, leaked listener, wrong output after hydration.
- **Wrong first frame:** the text on the first commit of a client-side mount, before effects run. `useEffect`-based solutions show the default here, then switch a frame later.

| Model  | Setup                        | Hard checks pass | Wrong first frame | Used library |
| ------ | ---------------------------- | ---------------- | ----------------- | ------------ |
| Haiku  | no library                   | 20/21            | 15/21             | 0/21         |
| Haiku  | installed, no pointer        | 20/21            | 15/21             | 1/21         |
| Haiku  | installed + one-line pointer | 21/21            | 0/21              | 21/21        |
| Sonnet | no library                   | 21/21            | 7/21              | 0/21         |
| Sonnet | installed, no pointer        | 21/21            | 6/21              | 1/21         |
| Sonnet | installed + one-line pointer | 21/21            | 0/21              | 21/21        |

Findings:

- Current models rarely ship hard bugs: one hydration mismatch and one broken import in 126 runs.
- Wrong first frames are common, mostly from the `useEffect` + `useState` pattern. Sonnet got every theme-toggle and window-width run wrong.
- Agents ignore an installed library unless something points them to it. The one-line pointer is what makes it work.
- When the prompt explicitly says the app is server-rendered, Sonnet uses `useSyncExternalStore` itself and gets 0/7 wrong. The library matters most for ordinary requests.

Caveats: 3 runs per task, tasks are within this library's scope, and only Claude models were tested. The first-frame check reads the DOM in a layout effect, so it would also flag a solution that corrects itself in its own `useLayoutEffect` (which the browser would not paint).

Reproduce (needs the `claude` CLI, about $2.50):

```sh
pnpm build
node eval/run.ts 3 8 haiku,sonnet realistic   # agents write solutions to eval/out/realistic/
EVAL_OUT=./out/realistic/ pnpm eval:score     # writes eval/out/realistic/RESULTS.md
pnpm eval:selftest                            # scorer sanity check on known-good and known-bad solutions
```

## Releasing

Add a changeset with `pnpm changeset` in each PR that changes the package. On `main`, `.github/workflows/release.yml` opens a "Version Packages" PR; merging it publishes to npm with provenance. Needs an `NPM_TOKEN` repo secret, or npm trusted publishing. `pnpm check` also runs `publint` and `arethetypeswrong` on the packed package.

## Adding a hook

1. `src/useThing.ts`, exported from `src/index.ts`.
2. `src/useThing.test.ts` calling `hookMatrix(() => useThing())`, plus hook-specific tests.
3. A size budget in `.size-limit.json`.
4. JSDoc with a description, "Use when / Don't use when", and `@example`.
5. A row in the `AGENTS.md` "Pick a hook" table.
6. `pnpm check` passes. `src/docs.test.ts` enforces all of the above.

## Scope

Browser state (media, storage, network, visibility, focus, size, scroll, language, permissions, location, idle) and the browser events and interactions agents commonly get wrong (listeners, outside clicks, shortcuts, timers, clipboard, sharing, scroll lock, fullscreen, wake lock, third-party scripts, unload, camera and microphone, messages between tabs, file drops, long press, swipe, focus trapping, timeouts, debouncing, text selection, scroll containers and chat auto-scroll, arrow-key navigation, animation frames, the URL hash, rendering the current time). Not a general utility collection: no data fetching, no state management, no generic helpers like `usePrevious`. Debouncing is in because it is a timer that agents commonly get wrong; `useMergedRefs` because several hooks here return refs that often land on one element; `useControllableState` because copying props into state is one of the most common React bugs agents write.
