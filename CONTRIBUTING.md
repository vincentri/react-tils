# Contributing

## Development

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm check                                            # format, lint, types, unit tests, compiled tests, build, size, package checks
pnpm demo                                             # demo dev server
pnpm exec playwright install chromium firefox webkit  # once, for browser tests
pnpm e2e                                              # browser tests
```

| Script               | What it does                                                                     |
| -------------------- | -------------------------------------------------------------------------------- |
| `pnpm check`         | Everything CI runs on each React version. Run it before pushing.                 |
| `pnpm test`          | Unit tests (Vitest, happy-dom)                                                   |
| `pnpm test:compiler` | Unit tests again on the library compiled with React Compiler                     |
| `pnpm e2e`           | Browser tests: the demo in Chromium, Firefox, WebKit, plus the Next.js example   |
| `pnpm e2e:compiler`  | Browser tests with the demo, library, and Next.js app compiled by React Compiler |
| `pnpm test:install`  | Installs the packed tarball into fresh projects, the way users get it            |
| `pnpm demo:build`    | Prerendered demo site and `llms.txt` in `demo/dist`                              |
| `pnpm size`          | Per-hook size budgets                                                            |

## Adding a hook

1. `src/useThing.ts`, exported from `src/index.ts`.
2. `src/useThing.test.ts` calling `hookMatrix(() => useThing())`, plus hook-specific tests.
3. A size budget in `.size-limit.json`.
4. JSDoc with a description, "Use when / Don't use when", and `@example`.
5. A row in the `AGENTS.md` "Pick a hook" table, and in the README hook tables.
6. A demo card in `demo/src/App.tsx` and a browser test in `e2e/` when the behavior depends on a real browser.
7. `pnpm check` passes. `src/docs.test.ts` enforces steps 1 to 5.

API rules every hook follows are in [AGENTS.md](AGENTS.md#api-rules).

## Scope

Browser state and the browser events and interactions agents commonly get wrong. Not a general utility collection: no data fetching, no state management, no generic helpers like `usePrevious`. Debouncing is in because it is a timer agents often get wrong; `useMergedRefs` because several hooks here return refs that often land on one element; `useControllableState` because copying props into state is one of the most common React bugs agents write.

## Tests

### Test matrix

Every hook must pass, on React 18, 19, and canary:

| Check                                                | Catches                                |
| ---------------------------------------------------- | -------------------------------------- |
| Server render with no `window`/`document`            | hooks that touch the DOM during render |
| Hydration with no recoverable error or console error | server/client markup mismatch          |
| StrictMode mount + unmount removes every listener    | leaked subscriptions                   |

The same checks ship to users as `hookMatrix` and `componentMatrix` from `@vincent.ri/react-tils/testing`.

### Browser tests

`e2e/` runs the built demo in Chromium, Firefox, and WebKit with Playwright: real viewport changes, color scheme, scrolling, ResizeObserver, IntersectionObserver, offline mode, reloads, a second tab, locale, geolocation and permissions, keyboard shortcuts, clipboard, scroll lock, `beforeunload` dialogs, fullscreen, messages between tabs, file drops, long press, swipes, focus trapping, chat auto-scroll, and a fake camera. Every test fails on any console error, which includes hydration mismatches.

`e2e-next/` runs `examples/nextjs`, a Next.js App Router app, and checks the core claim directly: after a client-side navigation, a react-tils component shows the real window width from its first frame, while a hand-written `useEffect` version on the same page shows `0` first.

Headless browsers can't drive tab visibility, window focus, wake lock, the share sheet, or the back/forward cache (`usePageRestore`; automated browsers never restore pages from it); unit tests cover their logic. Screen reader output (`useAnnounce`) is checked through its live regions, not with a real screen reader. Real phones are not tested.

### React Compiler

`pnpm test:compiler` compiles the library with React Compiler (oxc's Rust port, `oxc-transform-react`) set to fail on any function it can't compile, and runs all unit tests on the compiled code. `scripts/compiler-report.ts` then checks that every hook was compiled rather than skipped, and that a component breaking the Rules of React is rejected, so a pass can't mean the strict setting was ignored. `pnpm e2e:compiler` runs the browser tests with the demo and library compiled, and with the Next.js app compiled by Next's Rust compiler while it uses the published, uncompiled `dist`.

Test components stay uncompiled: they write hook values to outer variables during render so tests can read them, which the compiler rightly rejects.

### Install test

`pnpm test:install` packs the real tarball and installs it into fresh projects outside the repo:

- the tarball has `dist`, types, `AGENTS.md`, and the CLI, and no source or tests;
- npm with React 19, pnpm with React 18 (strict, so an undeclared dependency fails), and yarn and bun when installed: a server render using the root entry and a per-hook entry, with `internal/*` blocked;
- TypeScript with `moduleResolution` `bundler` and `nodenext`, including `@ts-expect-error` lines that fail if the types were `any`;
- `npx react-tils init` from the installed package;
- a Vite app compiled with React Compiler: production build, compared against a build without the compiler to confirm it was compiled, then run in Chromium.

## Evaluation

Headless Claude Code agents were given 7 tasks in a Next.js-shaped project: responsive sidebar, window width, persisted theme toggle, offline banner, pause when tab hidden, system dark mode, reduced motion. Prompts are normal requests and never mention SSR. Each task ran 3 times per model and setup. Every solution was scored with the same checks as `hookMatrix`, under each client state the task covers (for example mobile and desktop viewports):

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

Caveats: the evaluation ran on an earlier version with fewer hooks; 3 runs per task; tasks are within this library's scope; only Claude models were tested. The first-frame check reads the DOM in a layout effect, so it would also flag a solution that corrects itself in its own `useLayoutEffect` (which the browser would not paint).

Reproduce (needs the `claude` CLI, about $2.50):

```sh
pnpm build
node eval/run.ts 3 8 haiku,sonnet realistic   # agents write solutions to eval/out/realistic/
EVAL_OUT=./out/realistic/ pnpm eval:score     # writes eval/out/realistic/RESULTS.md
pnpm eval:selftest                            # scorer sanity check on known-good and known-bad solutions
```

## Releasing

**From GitHub:** Actions → Release → Run workflow. Pick patch, minor, or major and write one changelog line. The run checks everything, bumps the version, updates `CHANGELOG.md`, commits to `main`, publishes to npm with provenance, and creates the GitHub release. Tick "dry run" first to see the new version and changelog without committing or publishing.

**With changesets:** add one with `pnpm changeset` in a PR. On `main`, the workflow opens a "Version Packages" PR; approve its workflow run, wait for green, and merge to publish.

Either way, `scripts/publish.ts` publishes with npm trusted publishing (no stored token) and fails unless npm really has the new version with its provenance attestation. `pnpm check` also runs `publint`, `arethetypeswrong`, and an `npm publish --dry-run` that fails if npm would silently change `package.json`.

The demo deploys to GitHub Pages on every push to `main`.
