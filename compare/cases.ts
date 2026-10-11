// Each library's hook for each task, as a component. Shared by the server and client checks.
import * as mantine from '@mantine/hooks'
import * as reactuses from '@reactuses/core'
import * as uidotdev from '@uidotdev/usehooks'
import * as reactTils from '@vincent.ri/react-tils'
import * as ahooks from 'ahooks'
import { createElement, type FunctionComponent, useRef } from 'react'
import * as reactUse from 'react-use'
import * as usehooksTs from 'usehooks-ts'
import { type LibraryId, TASKS } from './tasks'

// The libraries' APIs differ, so each call is spelled out. `any` because each library types its
// own options and refs; the client render below catches a wrong call.
type Lib = Record<string, any>
const QUERY = '(min-width: 768px)'
const noop = () => {}
const div = (ref?: unknown) => createElement('div', ref ? { ref } : null)
const withRef = (use: (ref: { current: HTMLDivElement | null }) => void) => () => {
  const ref = useRef<HTMLDivElement>(null)
  use(ref)
  return div(ref)
}

const CALLS: Record<string, (lib: Lib) => FunctionComponent> = {
  // Media query
  'react-tils:media-query': (l) => () => String(l.useMediaQuery(QUERY)),
  'uidotdev:media-query': (l) => () => String(l.useMediaQuery(QUERY)),
  'usehooks-ts:media-query': (l) => () => String(l.useMediaQuery(QUERY)),
  'mantine:media-query': (l) => () => String(l.useMediaQuery(QUERY)),
  'react-use:media-query': (l) => () => String(l.useMedia(QUERY)),
  'reactuses:media-query': (l) => () => String(l.useMediaQuery(QUERY)),
  // Window size
  'react-tils:window-size': (l) => () => JSON.stringify(l.useWindowSize()),
  'uidotdev:window-size': (l) => () => JSON.stringify(l.useWindowSize()),
  'usehooks-ts:window-size': (l) => () => JSON.stringify(l.useWindowSize()),
  'mantine:window-size': (l) => () => JSON.stringify(l.useViewportSize()),
  'react-use:window-size': (l) => () => JSON.stringify(l.useWindowSize()),
  'reactuses:window-size': (l) => () => JSON.stringify(l.useWindowSize()),
  // Window scroll
  'react-tils:window-scroll': (l) => () => JSON.stringify(l.useWindowScroll()),
  'uidotdev:window-scroll': (l) => () => JSON.stringify(l.useWindowScroll()[0]),
  'mantine:window-scroll': (l) => () => JSON.stringify(l.useWindowScroll()[0]),
  'react-use:window-scroll': (l) => () => JSON.stringify(l.useWindowScroll()),
  'reactuses:window-scroll': (l) => () => JSON.stringify(l.useWindowScroll()),
  'ahooks:window-scroll': (l) => () => JSON.stringify(l.useScroll() ?? null),
  // Element in view
  'react-tils:in-view': (l) => () => div(l.useInView()[0]),
  'uidotdev:in-view': (l) => () => div(l.useIntersectionObserver()[0]),
  'usehooks-ts:in-view': (l) => () => div(l.useIntersectionObserver().ref),
  'mantine:in-view': (l) => () => div(l.useInViewport().ref),
  'react-use:in-view': (l) => withRef((ref) => l.useIntersection(ref, {})),
  'reactuses:in-view': (l) => withRef((ref) => l.useIntersectionObserver(ref, noop)),
  'ahooks:in-view': (l) => withRef((ref) => l.useInViewport(ref)),
  // localStorage state
  'react-tils:local-storage': (l) => () => String(l.useLocalStorage('compare', 0)[0]),
  'uidotdev:local-storage': (l) => () => String(l.useLocalStorage('compare', 0)[0]),
  'usehooks-ts:local-storage': (l) => () => String(l.useLocalStorage('compare', 0)[0]),
  'mantine:local-storage': (l) => () =>
    String(l.useLocalStorage({ key: 'compare', defaultValue: 0 })[0]),
  'react-use:local-storage': (l) => () => String(l.useLocalStorage('compare', 0)[0]),
  'reactuses:local-storage': (l) => () => String(l.useLocalStorage('compare', 0)[0]),
  'ahooks:local-storage': (l) => () =>
    String(l.useLocalStorageState('compare', { defaultValue: 0 })[0]),
  // Click outside
  'react-tils:click-outside': (l) => () => div(l.useClickOutside(noop)),
  'uidotdev:click-outside': (l) => () => div(l.useClickAway(noop)),
  'usehooks-ts:click-outside': (l) => withRef((ref) => l.useOnClickOutside(ref, noop)),
  'mantine:click-outside': (l) => () => div(l.useClickOutside(noop)),
  'react-use:click-outside': (l) => withRef((ref) => l.useClickAway(ref, noop)),
  'reactuses:click-outside': (l) => withRef((ref) => l.useClickOutside(ref, noop)),
  'ahooks:click-outside': (l) => withRef((ref) => l.useClickAway(noop, ref)),
  // Keyboard shortcut
  'react-tils:hotkey': (l) => () => (l.useHotkey('mod+k', noop), null),
  'mantine:hotkey': (l) => () => (l.useHotkeys([['mod+K', noop]]), null),
  'react-use:hotkey': (l) => () => (l.useKey('k', noop), null),
  'ahooks:hotkey': (l) => () => (l.useKeyPress('meta.k', noop), null),
  // Debounced value
  'react-tils:debounced-value': (l) => () => String(l.useDebouncedValue(1, 100)),
  'uidotdev:debounced-value': (l) => () => String(l.useDebounce(1, 100)),
  'usehooks-ts:debounced-value': (l) => () => String(l.useDebounceValue(1, 100)[0]),
  'mantine:debounced-value': (l) => () => String(l.useDebouncedValue(1, 100)[0]),
  'react-use:debounced-value': (l) => () => (l.useDebounce(noop, 100, [1]), null),
  'reactuses:debounced-value': (l) => () => String(l.useDebounce(1, 100)),
  'ahooks:debounced-value': (l) => () => String(l.useDebounce(1, { wait: 100 })),
  // Debounced callback
  'react-tils:debounced-callback': (l) => () => typeof l.useDebouncedCallback(noop, 100),
  'usehooks-ts:debounced-callback': (l) => () => typeof l.useDebounceCallback(noop, 100),
  'mantine:debounced-callback': (l) => () => typeof l.useDebouncedCallback(noop, 100),
  'reactuses:debounced-callback': (l) => () => typeof l.useDebounceFn(noop, 100).run,
  'ahooks:debounced-callback': (l) => () => typeof l.useDebounceFn(noop, { wait: 100 }).run,
  // Online status
  'react-tils:online': (l) => () => String(l.useOnline()),
  'uidotdev:online': (l) => () => String(l.useNetworkState().online),
  'mantine:online': (l) => () => String(l.useNetwork().online),
  'react-use:online': (l) => () => String(l.useNetworkState().online),
  'reactuses:online': (l) => () => String(l.useOnline()),
  'ahooks:online': (l) => () => String(l.useNetwork().online),
}

const MODULES: Record<LibraryId, Lib> = {
  'react-tils': reactTils,
  uidotdev,
  'usehooks-ts': usehooksTs,
  mantine,
  'react-use': reactUse,
  reactuses,
  ahooks,
}

/** Every library and task that has a hook, as a component to render. */
export const CASES = TASKS.flatMap(({ id, hooks }) =>
  (Object.entries(hooks) as [LibraryId, string | null][])
    .filter(([, hook]) => hook)
    .map(([lib, hook]) => {
      const make = CALLS[`${lib}:${id}`]
      if (!make) throw new Error(`no call written for ${lib}:${id}`)
      return { key: `${id}:${lib}`, task: id, lib, hook: hook!, Component: make(MODULES[lib]) }
    }),
)
