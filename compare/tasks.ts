// The libraries and everyday tasks on the docs site's Compare page. Plain data: the checks
// (compare.test.ts) and the size measurement (scripts/compare.ts) both read it.

export const LIBRARIES = [
  { id: 'react-tils', pkg: '@vincent.ri/react-tils' },
  { id: 'uidotdev', pkg: '@uidotdev/usehooks' },
  { id: 'usehooks-ts', pkg: 'usehooks-ts' },
  { id: 'mantine', pkg: '@mantine/hooks' },
  { id: 'react-use', pkg: 'react-use' },
  { id: 'reactuses', pkg: '@reactuses/core' },
  { id: 'ahooks', pkg: 'ahooks' },
] as const

export type LibraryId = (typeof LIBRARIES)[number]['id']

/** Each library's hook for the task, or null when it has none. */
export const TASKS: {
  id: string
  task: string
  hooks: Record<LibraryId, string | null>
  /** Where a library's closest hook works differently, so the row isn't read as like-for-like. */
  notes?: Partial<Record<LibraryId, string>>
}[] = [
  {
    id: 'media-query',
    task: 'Media query',
    hooks: {
      'react-tils': 'useMediaQuery',
      uidotdev: 'useMediaQuery',
      'usehooks-ts': 'useMediaQuery',
      mantine: 'useMediaQuery',
      'react-use': 'useMedia',
      reactuses: 'useMediaQuery',
      ahooks: null,
    },
  },
  {
    id: 'window-size',
    task: 'Window size',
    hooks: {
      'react-tils': 'useWindowSize',
      uidotdev: 'useWindowSize',
      'usehooks-ts': 'useWindowSize',
      mantine: 'useViewportSize',
      'react-use': 'useWindowSize',
      reactuses: 'useWindowSize',
      ahooks: null,
    },
  },
  {
    id: 'window-scroll',
    task: 'Window scroll',
    hooks: {
      'react-tils': 'useWindowScroll',
      uidotdev: 'useWindowScroll',
      'usehooks-ts': null,
      mantine: 'useWindowScroll',
      'react-use': 'useWindowScroll',
      reactuses: 'useWindowScroll',
      ahooks: 'useScroll',
    },
  },
  {
    id: 'in-view',
    task: 'Element in view',
    hooks: {
      'react-tils': 'useInView',
      uidotdev: 'useIntersectionObserver',
      'usehooks-ts': 'useIntersectionObserver',
      mantine: 'useInViewport',
      'react-use': 'useIntersection',
      reactuses: 'useIntersectionObserver',
      ahooks: 'useInViewport',
    },
  },
  {
    id: 'local-storage',
    task: 'localStorage state',
    hooks: {
      'react-tils': 'useLocalStorage',
      uidotdev: 'useLocalStorage',
      'usehooks-ts': 'useLocalStorage',
      mantine: 'useLocalStorage',
      'react-use': 'useLocalStorage',
      reactuses: 'useLocalStorage',
      ahooks: 'useLocalStorageState',
    },
  },
  {
    id: 'click-outside',
    task: 'Click outside',
    hooks: {
      'react-tils': 'useClickOutside',
      uidotdev: 'useClickAway',
      'usehooks-ts': 'useOnClickOutside',
      mantine: 'useClickOutside',
      'react-use': 'useClickAway',
      reactuses: 'useClickOutside',
      ahooks: 'useClickAway',
    },
  },
  {
    id: 'hotkey',
    task: 'Keyboard shortcut',
    hooks: {
      'react-tils': 'useHotkey',
      uidotdev: null,
      'usehooks-ts': null,
      mantine: 'useHotkeys',
      'react-use': 'useKey',
      reactuses: null,
      ahooks: 'useKeyPress',
    },
    notes: { 'react-use': 'One key; no modifiers like mod+k, no sequences.' },
  },
  {
    id: 'debounced-value',
    task: 'Debounced value',
    hooks: {
      'react-tils': 'useDebouncedValue',
      uidotdev: 'useDebounce',
      'usehooks-ts': 'useDebounceValue',
      mantine: 'useDebouncedValue',
      'react-use': 'useDebounce',
      reactuses: 'useDebounce',
      ahooks: 'useDebounce',
    },
    notes: { 'react-use': 'A debounced effect: you set state in it yourself.' },
  },
  {
    id: 'debounced-callback',
    task: 'Debounced callback',
    hooks: {
      'react-tils': 'useDebouncedCallback',
      uidotdev: null,
      'usehooks-ts': 'useDebounceCallback',
      mantine: 'useDebouncedCallback',
      'react-use': null,
      reactuses: 'useDebounceFn',
      ahooks: 'useDebounceFn',
    },
  },
  {
    id: 'online',
    task: 'Online status',
    hooks: {
      'react-tils': 'useOnline',
      uidotdev: 'useNetworkState',
      'usehooks-ts': null,
      mantine: 'useNetwork',
      'react-use': 'useNetworkState',
      reactuses: 'useOnline',
      ahooks: 'useNetwork',
    },
  },
]
