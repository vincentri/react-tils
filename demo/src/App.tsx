import {
  createContext,
  createElement,
  type CSSProperties,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  useAnimationFrame,
  useAnnounce,
  useAutosizeTextarea,
  useBeforeUnload,
  useBroadcastChannel,
  useCaretPosition,
  useClickOutside,
  useControllableState,
  useCookie,
  useCopyToClipboard,
  useDebouncedCallback,
  useDebouncedValue,
  useDeviceOrientation,
  useDocumentVisibility,
  useDrag,
  useElementSize,
  useElementScroll,
  useEventListener,
  useFileDrop,
  useEventSource,
  useFocusTrap,
  useFocusWithin,
  useFullscreen,
  useGeolocation,
  useHash,
  useHotkey,
  useHydrated,
  useIdle,
  useInterval,
  useInView,
  useIsStuck,
  useLocalStorage,
  useLongPress,
  useMediaRecorder,
  useMergedRefs,
  useMediaQuery,
  useNetworkInformation,
  useNow,
  usePasteFiles,
  useOnline,
  usePageRestore,
  usePermission,
  usePreferredLanguages,
  useRovingFocus,
  useScript,
  useScrollDirection,
  useScrollLock,
  useScrollProgress,
  useScrollSpy,
  useServiceWorkerUpdate,
  useSessionStorage,
  useSpeechSynthesis,
  useSpeechRecognition,
  useShare,
  useStickToBottom,
  useSwipe,
  usePointerPosition,
  useTextSelection,
  useThrottledCallback,
  useTimeout,
  usePrevious,
  useSearchParam,
  useUserMedia,
  useVisualViewport,
  useWakeLock,
  useWindowFocus,
  useWindowScroll,
  useWindowSize,
} from '@vincent.ri/react-tils'
import { hookDoc, PACKAGE, REPO } from './docs'

const BASE = import.meta.env.BASE_URL
export const hookUrl = (hook: string) => `${BASE}hooks/${hook}/`

// On a hook's own page, its demo card shows only the live demo: the page has the rest.
const OnHookPage = createContext(false)

/** Text with `code` spans. */
function Prose({ text }: { text: string }) {
  return createElement(
    Fragment,
    null,
    ...text.split('`').map((part, i) => (i % 2 === 1 ? createElement('code', null, part) : part)),
  )
}

function Card({ hook, hint, children }: { hook: string; hint: string; children: ReactNode }) {
  const hooks = hook.split(' · ')
  const onHookPage = useContext(OnHookPage)
  if (onHookPage)
    return (
      <div className="demo" data-hook={hook}>
        <p className="hint">{hint}</p>
        <div className="body">{children}</div>
      </div>
    )
  const examples = hooks
    .map((name) => hookDoc(name).example)
    .filter(Boolean)
    .join('\n\n')
  return (
    <section className="card" id={hooks[0]} data-hook={hook}>
      {hooks.slice(1).map((name) => (
        <span key={name} id={name} className="anchor" />
      ))}
      <h3>
        {hooks.map((name, i) => (
          <Fragment key={name}>
            {i > 0 && ' · '}
            <a href={hookUrl(name)} data-testid={`docs-${name}`}>
              <code>{name}</code>
            </a>
          </Fragment>
        ))}
      </h3>
      {hooks.map((name) => (
        <p key={name} className="desc">
          <Prose text={hookDoc(name).description[0] ?? ''} />
        </p>
      ))}
      <div className="card-grid">
        <div className="demo">
          <p className="hint">{hint}</p>
          <div className="body">{children}</div>
        </div>
        {examples && (
          <pre className="code">
            <code>{examples}</code>
          </pre>
        )}
      </div>
    </section>
  )
}

/** The live value of a hook. `data-testid` is what the e2e tests read. */
function Value({ id, children }: { id: string; children: ReactNode }) {
  return (
    <output className="value" data-testid={id}>
      {children}
    </output>
  )
}

function MediaQueryDemo() {
  const wide = useMediaQuery('(min-width: 768px)')
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  return (
    <Card hook="useMediaQuery" hint="Resize the window, or switch your OS theme.">
      <Value id="media-wide">{wide ? 'wide' : 'narrow'}</Value>
      <Value id="media-dark">{dark ? 'dark' : 'light'}</Value>
    </Card>
  )
}

function WindowSizeDemo() {
  const { width, height } = useWindowSize()
  return (
    <Card hook="useWindowSize" hint="Resize the window.">
      <Value id="window-size">
        {width}×{height}
      </Value>
    </Card>
  )
}

function WindowScrollDemo() {
  const { y } = useWindowScroll()
  return (
    <Card hook="useWindowScroll" hint="Scroll the page.">
      <Value id="window-scroll">y = {Math.round(y)}</Value>
    </Card>
  )
}

function ElementSizeDemo() {
  const [contentRef, { width }] = useElementSize<HTMLDivElement>()
  const [borderRef, border] = useElementSize<HTMLDivElement>({ box: 'border-box' })
  const ref = useMergedRefs(contentRef, borderRef)
  const [wide, setWide] = useState(false)
  return (
    <Card hook="useElementSize" hint="The box reports its own width.">
      <div ref={ref} className="box" style={{ width: wide ? 240 : 160 }}>
        <Value id="element-width">{Math.round(width)}px</Value>
        <Value id="element-border-width">border box {Math.round(border.width)}px</Value>
      </div>
      <button type="button" data-testid="element-toggle" onClick={() => setWide(!wide)}>
        {wide ? 'Shrink' : 'Grow'}
      </button>
    </Card>
  )
}

function OnlineDemo() {
  const online = useOnline()
  return (
    <Card hook="useOnline" hint="Turn off your network.">
      <Value id="online">{online ? 'online' : 'offline'}</Value>
    </Card>
  )
}

function VisibilityDemo() {
  const visibility = useDocumentVisibility()
  const focused = useWindowFocus()
  return (
    <Card
      hook="useDocumentVisibility · useWindowFocus"
      hint="Switch tabs or windows and come back."
    >
      <Value id="visibility">{visibility}</Value>
      <Value id="focus">{focused ? 'focused' : 'unfocused'}</Value>
    </Card>
  )
}

function HydratedDemo() {
  const hydrated = useHydrated()
  return (
    <Card hook="useHydrated" hint="false in the server HTML, true once hydrated.">
      <Value id="hydrated">{String(hydrated)}</Value>
    </Card>
  )
}

function StorageDemo() {
  const [local, setLocal] = useLocalStorage('demo-count', 0)
  const [session, setSession] = useSessionStorage('demo-session-count', 0)
  return (
    <Card
      hook="useLocalStorage · useSessionStorage"
      hint="Reload: both stay. Open a second tab: local syncs, session does not."
    >
      <div className="row">
        <Value id="local-count">local {local}</Value>
        <button type="button" data-testid="local-inc" onClick={() => setLocal((c) => c + 1)}>
          +1
        </button>
      </div>
      <div className="row">
        <Value id="session-count">session {session}</Value>
        <button type="button" data-testid="session-inc" onClick={() => setSession((c) => c + 1)}>
          +1
        </button>
      </div>
    </Card>
  )
}

function LanguageDemo() {
  const languages = usePreferredLanguages()
  return (
    <Card hook="usePreferredLanguages" hint="From your browser's language settings.">
      <Value id="languages">{languages.join(', ')}</Value>
    </Card>
  )
}

function GeolocationDemo() {
  const permission = usePermission('geolocation')
  const [asked, setAsked] = useState(false)
  const { loading, position, error } = useGeolocation({ enabled: asked })
  return (
    <Card hook="usePermission · useGeolocation" hint="No prompt until you click.">
      <Value id="geo-permission">permission: {permission}</Value>
      {!asked ? (
        <button type="button" data-testid="geo-ask" onClick={() => setAsked(true)}>
          Use my location
        </button>
      ) : (
        <Value id="geo-position">
          {loading
            ? 'locating…'
            : error
              ? `error: ${error.message}`
              : `${position!.coords.latitude.toFixed(2)}, ${position!.coords.longitude.toFixed(2)}`}
        </Value>
      )}
    </Card>
  )
}

function IdleDemo() {
  const idle = useIdle(3000)
  return (
    <Card hook="useIdle" hint="Don't touch anything for 3 seconds.">
      <Value id="idle">{idle ? 'idle' : 'active'}</Value>
    </Card>
  )
}

function EventListenerDemo() {
  const [key, setKey] = useState('none')
  useEventListener('window', 'keydown', (event) => setKey(event.key))
  return (
    <Card hook="useEventListener" hint="Press any key.">
      <Value id="last-key">last key: {key}</Value>
    </Card>
  )
}

function ClickOutsideDemo() {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open)
  return (
    <Card hook="useClickOutside" hint="Open the menu, then click anywhere else.">
      <div ref={ref} className="menu-wrap">
        <button type="button" data-testid="menu-toggle" onClick={() => setOpen(!open)}>
          Menu
        </button>
        {open && (
          <ul className="menu" data-testid="menu">
            <li>Profile</li>
            <li>Settings</li>
          </ul>
        )}
      </div>
    </Card>
  )
}

function HotkeyDemo() {
  const [open, setOpen] = useState(false)
  useHotkey('mod+k', () => setOpen(true))
  useHotkey('Escape', () => setOpen(false), { enabled: open })
  const [sequences, setSequences] = useState(0)
  useHotkey('g i', () => setSequences((n) => n + 1))
  return (
    <Card hook="useHotkey" hint="Press ⌘K / Ctrl+K, then Escape. Or press g, then i.">
      <Value id="palette">{open ? 'palette open' : 'palette closed'}</Value>
      <Value id="sequence">g i pressed: {sequences}</Value>
    </Card>
  )
}

function CopyDemo() {
  const [copy, copied] = useCopyToClipboard()
  return (
    <Card hook="useCopyToClipboard" hint="Copies a short text.">
      <button type="button" data-testid="copy" onClick={() => copy('hello from hooks')}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </Card>
  )
}

function ShareDemo() {
  const { supported, share } = useShare()
  return (
    <Card hook="useShare" hint="Opens the native share sheet where supported.">
      <Value id="share-supported">{supported ? 'supported' : 'not supported'}</Value>
      {supported && (
        <button
          type="button"
          onClick={() => share({ title: '@vincent.ri/react-tils', url: location.href })}
        >
          Share
        </button>
      )}
    </Card>
  )
}

function ScrollLockDemo() {
  const [open, setOpen] = useState(false)
  useScrollLock(open)
  return (
    <Card hook="useScrollLock" hint="Opens a modal; the page can't scroll behind it.">
      <button type="button" data-testid="modal-open" onClick={() => setOpen(true)}>
        Open modal
      </button>
      {open && (
        <div className="backdrop">
          <div role="dialog" aria-modal="true" className="modal" data-testid="modal">
            <p>The page behind is locked.</p>
            <button type="button" data-testid="modal-close" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function BeforeUnloadDemo() {
  const [dirty, setDirty] = useState(false)
  useBeforeUnload(dirty)
  return (
    <Card hook="useBeforeUnload" hint="Check the box, then try to reload.">
      <label>
        <input
          type="checkbox"
          data-testid="dirty"
          checked={dirty}
          onChange={(e) => setDirty(e.target.checked)}
        />{' '}
        Unsaved changes
      </label>
    </Card>
  )
}

function IntervalDemo() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(true)
  useInterval(() => setCount(count + 1), running ? 500 : null, { pauseWhenHidden: true })
  return (
    <Card hook="useInterval" hint="Ticks every 500ms; pauses in background tabs.">
      <div className="row">
        <Value id="ticks">{count} ticks</Value>
        <button type="button" data-testid="ticks-toggle" onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Resume'}
        </button>
      </div>
    </Card>
  )
}

function ScriptDemo() {
  const [enabled, setEnabled] = useState(false)
  const status = useScript(`${import.meta.env.BASE_URL}demo-script.js`, { enabled })
  return (
    <Card hook="useScript" hint="Loads a script once, on demand.">
      <div className="row">
        <Value id="script-status">{status}</Value>
        <button type="button" data-testid="script-load" onClick={() => setEnabled(true)}>
          Load
        </button>
      </div>
    </Card>
  )
}

function FullscreenDemo() {
  const [ref, fullscreen] = useFullscreen<HTMLDivElement>()
  return (
    <Card hook="useFullscreen" hint="Esc also exits.">
      <div ref={ref} className="box fs">
        <Value id="fullscreen">{fullscreen.active ? 'fullscreen' : 'normal'}</Value>
        {fullscreen.supported && (
          <button type="button" data-testid="fullscreen-toggle" onClick={fullscreen.toggle}>
            {fullscreen.active ? 'Exit' : 'Fullscreen'}
          </button>
        )}
      </div>
    </Card>
  )
}

function WakeLockDemo() {
  const [on, setOn] = useState(false)
  const { supported, active } = useWakeLock(on)
  return (
    <Card hook="useWakeLock" hint="Keeps the screen on while checked.">
      <label>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Keep screen
        on
      </label>
      <Value id="wakelock">
        {supported ? (active ? 'screen kept on' : 'off') : 'not supported'}
      </Value>
    </Card>
  )
}

function BroadcastDemo() {
  const [received, setReceived] = useState('nothing yet')
  const post = useBroadcastChannel<string>('demo-channel', setReceived)
  return (
    <Card hook="useBroadcastChannel" hint="Open this page in two tabs, then send.">
      <Value id="broadcast-received">received: {received}</Value>
      <button
        type="button"
        data-testid="broadcast-send"
        onClick={() => post(`hi at ${new Date().toLocaleTimeString()}`)}
      >
        Send to other tabs
      </button>
    </Card>
  )
}

function FileDropDemo() {
  const [names, setNames] = useState<string[]>([])
  const [ref, isOver] = useFileDrop<HTMLDivElement>((files) => setNames(files.map((f) => f.name)))
  return (
    <Card hook="useFileDrop" hint="Drag files from your desktop onto the box.">
      <div ref={ref} className={isOver ? 'box drop over' : 'box drop'} data-testid="drop-zone">
        <Value id="drop-state">
          {isOver ? 'release to drop' : names.length ? names.join(', ') : 'drop files here'}
        </Value>
      </div>
    </Card>
  )
}

function LongPressDemo() {
  const [held, setHeld] = useState(0)
  const [clicks, setClicks] = useState(0)
  const longPress = useLongPress(() => setHeld((n) => n + 1))
  return (
    <Card hook="useLongPress" hint="Click, or press and hold for half a second.">
      <button
        type="button"
        className="hold"
        data-testid="hold"
        {...longPress}
        onClick={() => setClicks((n) => n + 1)}
      >
        Hold me
      </button>
      <Value id="hold-count">
        held {held} · clicked {clicks}
      </Value>
    </Card>
  )
}

function UserMediaDemo() {
  const [on, setOn] = useState(false)
  const { stream, error, loading } = useUserMedia({ video: true, audio: false }, { enabled: on })
  const videoRef = useCallback(
    (video: HTMLVideoElement | null) => {
      if (video) video.srcObject = stream
    },
    [stream],
  )
  // Exposed so the e2e test can check that the camera is really released.
  useEffect(() => {
    if (stream) Object.assign(window, { demoStream: stream })
  }, [stream])
  return (
    <Card hook="useUserMedia" hint="The camera light turns off when you stop.">
      <button type="button" data-testid="camera-toggle" onClick={() => setOn(!on)}>
        {on ? 'Stop camera' : 'Start camera'}
      </button>
      <Value id="camera">
        {error ? `error: ${error.name}` : loading ? 'starting…' : stream ? 'live' : 'off'}
      </Value>
      {stream && <video ref={videoRef} className="video" autoPlay playsInline muted />}
    </Card>
  )
}

function DebounceDemo() {
  const [searched, setSearched] = useState('')
  const [calls, setCalls] = useState(0)
  const search = useDebouncedCallback((query: string) => {
    setSearched(query)
    setCalls((n) => n + 1)
  }, 300)
  return (
    <Card hook="useDebouncedCallback" hint="Type quickly: one search after you pause.">
      <input data-testid="search" placeholder="Search…" onChange={(e) => search(e.target.value)} />
      <Value id="searched">
        searched: {searched || '—'} · calls {calls}
      </Value>
    </Card>
  )
}

function FocusTrapDemo() {
  const [open, setOpen] = useState(false)
  const ref = useFocusTrap<HTMLDivElement>(open)
  useHotkey('Escape', () => setOpen(false), { enabled: open })
  return (
    <Card hook="useFocusTrap" hint="Open, then press Tab: focus stays inside.">
      <button type="button" data-testid="drawer-open" onClick={() => setOpen(true)}>
        Open drawer
      </button>
      {open && (
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Drawer"
          className="drawer"
          data-testid="drawer"
        >
          <input aria-label="Name" placeholder="Name" />
          <input aria-label="Email" placeholder="Email" />
          <button type="button" data-testid="drawer-close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </Card>
  )
}

function SwipeDemo() {
  const [last, setLast] = useState('none')
  const ref = useSwipe<HTMLDivElement>((direction) => setLast(direction))
  return (
    <Card hook="useSwipe" hint="Swipe or drag across the box.">
      <div ref={ref} className="box swipe" data-testid="swipe-area">
        <Value id="swipe">last swipe: {last}</Value>
      </div>
    </Card>
  )
}

function VisualViewportDemo() {
  const { width, height, bottomInset } = useVisualViewport()
  return (
    <Card hook="useVisualViewport" hint="On a phone, open the keyboard: bottomInset grows.">
      <Value id="visual-viewport">
        {Math.round(width)}×{Math.round(height)} · bottomInset {bottomInset}
      </Value>
    </Card>
  )
}

function NetworkDemo() {
  const { effectiveType, saveData } = useNetworkInformation()
  return (
    <Card hook="useNetworkInformation" hint="Chromium only; unknown elsewhere.">
      <Value id="network">
        {effectiveType} · data saver {saveData ? 'on' : 'off'}
      </Value>
    </Card>
  )
}

function NowDemo() {
  const now = useNow(1000)
  return (
    <Card hook="useNow" hint="A clock with no hydration mismatch: placeholder in the server HTML.">
      <Value id="now">
        {now === null ? '--:--:--' : new Date(now).toLocaleTimeString('en-GB')}
      </Value>
    </Card>
  )
}

function HashDemo() {
  const [hash, setHash] = useHash()
  const tab = hash === '#billing' ? 'billing' : 'profile'
  return (
    <Card hook="useHash" hint="Pick a tab, then reload or press Back.">
      <button type="button" data-testid="tab-profile" onClick={() => setHash('#profile-tab')}>
        Profile
      </button>{' '}
      <a href="#billing" data-testid="tab-billing">
        Billing
      </a>
      <Value id="hash">
        tab: {tab} · hash {hash || '(none)'}
      </Value>
    </Card>
  )
}

function SearchParamDemo() {
  const [query, setQuery] = useSearchParam('q')
  const [sort, setSort] = useSearchParam('sort')
  return (
    <Card hook="useSearchParam" hint="Type, pick a sort, then reload or press Back.">
      <input
        data-testid="query-input"
        placeholder="Search…"
        value={query ?? ''}
        onChange={(e) => setQuery(e.target.value || null)}
      />{' '}
      {['new', 'top'].map((option) => (
        <button
          key={option}
          type="button"
          data-testid={`sort-${option}`}
          aria-pressed={sort === option}
          onClick={() => setSort(option, { push: true })}
        >
          {option}
        </button>
      ))}
      <Value id="query">
        q: {query ?? '(none)'} · sort: {sort ?? '(none)'}
      </Value>
    </Card>
  )
}

function ThrottleDemo() {
  const [events, setEvents] = useState(0)
  const [saved, setSaved] = useState<{ value: number; count: number }>({ value: 50, count: 0 })
  const save = useThrottledCallback((value: number) => {
    setSaved((s) => ({ value, count: s.count + 1 }))
  }, 500)
  return (
    <Card
      hook="useThrottledCallback"
      hint="Drag the slider: saves every 500 ms, then once at the end."
    >
      <input
        type="range"
        data-testid="throttle-slider"
        aria-label="Volume"
        defaultValue={50}
        onChange={(e) => {
          setEvents((n) => n + 1)
          save(Number(e.target.value))
        }}
      />
      <Value id="throttled">
        events {events} · saves {saved.count} · saved {saved.value}
      </Value>
    </Card>
  )
}

function PreviousDemo() {
  const [price, setPrice] = useState(100)
  const [, rerender] = useState(0)
  const previous = usePrevious(price)
  const trend = previous === undefined ? '' : price > previous ? ' ▲' : ' ▼'
  return (
    <Card
      hook="usePrevious"
      hint="Change the price; an unrelated re-render keeps the previous one."
    >
      <button type="button" data-testid="price-up" onClick={() => setPrice(price + 5)}>
        +5
      </button>{' '}
      <button type="button" data-testid="price-down" onClick={() => setPrice(price - 5)}>
        −5
      </button>{' '}
      <button type="button" data-testid="price-rerender" onClick={() => rerender((n) => n + 1)}>
        Re-render
      </button>
      <Value id="price">
        {price}
        {trend} · was {previous ?? '—'}
      </Value>
    </Card>
  )
}

function PointerPositionDemo() {
  const [ref, pointer] = usePointerPosition<HTMLDivElement>()
  return (
    <Card hook="usePointerPosition" hint="Move the mouse over the box, or touch it.">
      <div
        ref={ref}
        className="spotlight"
        data-testid="spotlight"
        style={
          {
            '--x': `${pointer?.x ?? -999}px`,
            '--y': `${pointer?.y ?? -999}px`,
          } as CSSProperties
        }
      />
      <Value id="pointer">
        {pointer ? `x ${Math.round(pointer.x)} · y ${Math.round(pointer.y)}` : 'outside'}
      </Value>
    </Card>
  )
}

function FocusWithinDemo() {
  const [open, setOpen] = useState(false)
  const outsideRef = useClickOutside(() => setOpen(false), open)
  const [focusRef, focused] = useFocusWithin({ onLeave: () => setOpen(false) })
  const ref = useMergedRefs(outsideRef, focusRef)
  return (
    <Card
      hook="useFocusWithin"
      hint="Open the menu with the keyboard, then Tab past the last item."
    >
      <div ref={ref} className="menu-wrap">
        <button type="button" data-testid="fw-toggle" onClick={() => setOpen(!open)}>
          Menu {open ? '▴' : '▾'}
        </button>
        {open && (
          <div className="row" data-testid="fw-menu">
            <button type="button">Rename</button>
            <button type="button">Duplicate</button>
            <button type="button" data-testid="fw-last">
              Delete
            </button>
          </div>
        )}
      </div>
      <button type="button" data-testid="fw-after">
        Next control
      </button>
      <Value id="focus-within">
        focus inside: {focused ? 'yes' : 'no'} · menu {open ? 'open' : 'closed'}
      </Value>
    </Card>
  )
}

function EventSourceDemo() {
  // A static site has no server: a small service worker (demo-events-sw.js) answers ./demo-events
  // with a real event stream. It is only installed when you press Connect.
  const [url, setUrl] = useState<string | null>(null)
  const [ticks, setTicks] = useState(0)
  const { status, data } = useEventSource(url, {
    events: ['tick'],
    onMessage: () => setTicks((n) => n + 1),
  })
  const connect = async () => {
    const sw = navigator.serviceWorker
    if (!sw) return
    await sw.register('./demo-events-sw.js')
    if (!sw.controller)
      await new Promise((resolve) =>
        sw.addEventListener('controllerchange', resolve, { once: true }),
      )
    setUrl('./demo-events')
  }
  return (
    <Card
      hook="useEventSource"
      hint="A service worker stands in for the server: one tick a second."
    >
      {url === null ? (
        <button type="button" data-testid="sse-connect" onClick={connect}>
          Connect
        </button>
      ) : (
        <button type="button" data-testid="sse-disconnect" onClick={() => setUrl(null)}>
          Disconnect
        </button>
      )}
      <Value id="sse">
        {status} · received {ticks} · latest{' '}
        {data ? (JSON.parse(data) as { time: string }).time : '—'}
      </Value>
    </Card>
  )
}

function AnimationFrameDemo() {
  const [playing, setPlaying] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const frames = useRef<HTMLOutputElement>(null)
  const state = useRef({ x: 0, count: 0 })
  useAnimationFrame((deltaMs) => {
    const s = state.current
    s.x = (s.x + deltaMs * 0.1) % 200
    s.count += 1
    // Written to the DOM directly: no re-render per frame.
    if (box.current) box.current.style.transform = `translateX(${s.x}px)`
    if (frames.current) frames.current.textContent = `frames ${s.count}`
  }, playing)
  return (
    <Card hook="useAnimationFrame" hint="Moves without re-rendering; stops when paused.">
      <button type="button" data-testid="animation-toggle" onClick={() => setPlaying(!playing)}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <div className="track">
        <div ref={box} className="dot" />
      </div>
      <output ref={frames} className="value" data-testid="frames">
        frames 0
      </output>
    </Card>
  )
}

function MergedRefsDemo() {
  const [inViewRef, inView] = useInView<HTMLDivElement>()
  const [sizeRef, { width }] = useElementSize<HTMLDivElement>()
  const own = useRef<HTMLDivElement>(null)
  const [tag, setTag] = useState('')
  useEffect(() => setTag(own.current?.tagName ?? ''), [])
  return (
    <Card hook="useMergedRefs" hint="Three refs on one box: useInView, useElementSize, useRef.">
      <div ref={useMergedRefs(inViewRef, sizeRef, own)} className="box">
        <Value id="merged">
          in view {inView ? 'yes' : 'no'} · width {Math.round(width)} · useRef {tag || '—'}
        </Value>
      </div>
    </Card>
  )
}

function DebouncedValueDemo() {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  return (
    <Card hook="useDebouncedValue" hint="The debounced copy catches up after you pause.">
      <input
        data-testid="debounced-input"
        placeholder="Type…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Value id="debounced-value">debounced: {debounced || '—'}</Value>
    </Card>
  )
}

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${i + 1}`)

function ElementScrollDemo() {
  const [ref, { y, atTop, atBottom }] = useElementScroll<HTMLDivElement>()
  const shadows = [!atTop && 'shadow-top', !atBottom && 'shadow-bottom'].filter(Boolean).join(' ')
  return (
    <Card hook="useElementScroll" hint="Scroll the list: shadows show where there is more.">
      <div ref={ref} className={`scroller ${shadows}`} data-testid="scroll-panel">
        {ROWS.map((row) => (
          <div key={row}>{row}</div>
        ))}
      </div>
      <Value id="element-scroll">
        y {Math.round(y)} · top {atTop ? 'yes' : 'no'} · bottom {atBottom ? 'yes' : 'no'}
      </Value>
    </Card>
  )
}

const REPLY =
  'Sure. Streamed replies grow the last message without any scroll event, and the list keeps following them until you scroll up to read something earlier.'.split(
    ' ',
  )

function StickToBottomDemo() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hi!' },
    { id: 2, text: 'Ask me anything.' },
  ])
  const [words, setWords] = useState(-1) // words streamed so far; -1 = idle
  const [ref, { atBottom, scrollToBottom }] = useStickToBottom<HTMLDivElement>()
  useInterval(
    () => {
      const next = words + 1
      setMessages((list) => [
        ...list.slice(0, -1),
        { ...list.at(-1)!, text: REPLY.slice(0, next).join(' ') },
      ])
      setWords(next === REPLY.length ? -1 : next)
    },
    words >= 0 ? 60 : null,
  )
  const stream = () => {
    setMessages((list) => [
      ...list,
      { id: list.length + 1, text: 'Why does it stop when I scroll up?' },
      { id: list.length + 2, text: '' },
    ])
    setWords(0)
  }
  return (
    <Card hook="useStickToBottom" hint="Stream a reply, then scroll up while it streams.">
      <div ref={ref} className="scroller chat" data-testid="chat">
        <div>
          {messages.map((m) => (
            <p key={m.id}>{m.text}</p>
          ))}
        </div>
      </div>
      <button type="button" data-testid="chat-stream" onClick={stream} disabled={words >= 0}>
        Stream a reply
      </button>{' '}
      {!atBottom && (
        <button type="button" data-testid="chat-jump" onClick={() => scrollToBottom()}>
          Jump to latest
        </button>
      )}
      <Value id="chat-following">following: {atBottom ? 'yes' : 'no'}</Value>
    </Card>
  )
}

function RovingFocusDemo() {
  const ref = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
  const [last, setLast] = useState('none')
  return (
    <Card
      hook="useRovingFocus"
      hint="Tab into the toolbar, then use the arrow keys, or type a letter."
    >
      <div ref={ref} role="toolbar" aria-label="Formatting" data-testid="toolbar">
        {['Bold', 'Italic', 'Underline', 'Strike'].map((name) => (
          <button key={name} type="button" onClick={() => setLast(name)}>
            {name}
          </button>
        ))}
      </div>
      <Value id="toolbar-last">pressed: {last}</Value>
    </Card>
  )
}

function TimeoutDemo() {
  const [saved, setSaved] = useState(false)
  const restart = useTimeout(() => setSaved(false), 2000)
  const save = () => {
    setSaved(true)
    restart()
  }
  return (
    <Card hook="useTimeout" hint="Shows for 2s after the latest save.">
      <button type="button" data-testid="save" onClick={save}>
        Save
      </button>
      <Value id="saved">{saved ? 'Saved ✓' : 'not saved'}</Value>
    </Card>
  )
}

type DisclosureProps = {
  id: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Disclosure({ id, open: openProp, defaultOpen = false, onOpenChange }: DisclosureProps) {
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
  return (
    <button type="button" data-testid={id} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      {id}: {open ? 'open' : 'closed'}
    </button>
  )
}

function ControllableDemo() {
  const [open, setOpen] = useState(false)
  return (
    <Card hook="useControllableState" hint="Same component: owns its state, or the parent does.">
      <Disclosure id="uncontrolled" />
      <Disclosure id="controlled" open={open} onOpenChange={setOpen} />
      <button type="button" data-testid="parent-close" onClick={() => setOpen(false)}>
        Close from parent
      </button>
      <Value id="parent-open">parent: {open ? 'open' : 'closed'}</Value>
    </Card>
  )
}

function TextSelectionDemo() {
  const [ref, selection] = useTextSelection<HTMLParagraphElement>()
  return (
    <Card hook="useTextSelection" hint="Select some text with the mouse or keyboard.">
      <p ref={ref} data-testid="selectable">
        Hooks for browser state that render the right first frame. Double-click{' '}
        <span data-testid="selectable-word">anything</span> here.
      </p>
      <Value id="selected">selected: {selection ? selection.text : '—'}</Value>
    </Card>
  )
}

function AutosizeDemo() {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(0)
  const ref = useAutosizeTextarea({ maxRows: 5 })
  return (
    <Card
      hook="useAutosizeTextarea"
      hint="Type several lines: it grows up to 5, then scrolls. Send clears it."
    >
      <textarea
        ref={ref}
        rows={1}
        className="autosize"
        data-testid="autosize"
        placeholder="Message…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="button"
        data-testid="autosize-send"
        onClick={() => {
          setMessage('')
          setSent((n) => n + 1)
        }}
      >
        Send
      </button>
      <Value id="autosize-sent">sent {sent}</Value>
    </Card>
  )
}

function PasteFilesDemo() {
  const [files, setFiles] = useState<string[]>([])
  const ref = usePasteFiles<HTMLDivElement>(
    (pasted) => setFiles(pasted.map((file) => `${file.name} (${file.type})`)),
    { accept: 'image/*' },
  )
  return (
    <Card
      hook="usePasteFiles"
      hint="Copy a screenshot, click the box, and paste. Text pastes normally."
    >
      <div ref={ref} className="paste">
        <textarea data-testid="paste-input" rows={2} placeholder="Paste an image here" />
      </div>
      <Value id="pasted">{files.length > 0 ? files.join(', ') : 'nothing pasted'}</Value>
    </Card>
  )
}

function ScrollSpyDemo({ active }: { active: string | null }) {
  return (
    <Card
      hook="useScrollSpy"
      hint="Scroll the page: the sidebar highlights the section you're reading."
    >
      <Value id="spy-active">reading: {active ?? '—'}</Value>
    </Card>
  )
}

function IsStuckDemo({ stuck }: { stuck: boolean }) {
  return (
    <Card hook="useIsStuck" hint="The status bar at the top gets a shadow once it sticks.">
      <Value id="stuck">status bar stuck: {stuck ? 'yes' : 'no'}</Value>
    </Card>
  )
}

function InViewCard({ inView }: { inView: boolean }) {
  return (
    <Card hook="useInView" hint="Watches the footer at the very bottom of the page.">
      <Value id="inview-card">footer in view: {inView ? 'yes' : 'no'}</Value>
    </Card>
  )
}

function ScrollDirectionCard({ direction }: { direction: string }) {
  return (
    <Card hook="useScrollDirection" hint="Scroll down, then up. Also shown in the status bar.">
      <Value id="scroll-direction-card">scrolling {direction}</Value>
    </Card>
  )
}

function PageRestoreDemo() {
  const [restores, setRestores] = useState(0)
  usePageRestore(() => setRestores((n) => n + 1))
  return (
    <Card hook="usePageRestore" hint="Open another page in this tab, then press Back.">
      <Value id="restored">restored from cache: {restores}</Value>
      <a href="https://github.com/vincentri/react-tils" data-testid="leave">
        Go to the GitHub repo
      </a>
    </Card>
  )
}

function DragDemo() {
  const [width, setWidth] = useState(140)
  const handle = useDrag<HTMLDivElement>(({ deltaX }) =>
    setWidth((w) => Math.min(260, Math.max(60, w + deltaX))),
  )
  return (
    <Card hook="useDrag" hint="Drag the bar between the panes, even past the edge.">
      <div className="split">
        <div className="pane" style={{ width }}>
          left
        </div>
        <div
          ref={handle}
          className="splitter"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={width}
          data-testid="splitter"
        />
        <div className="pane grow">right</div>
      </div>
      <Value id="pane-width">left pane: {width}px</Value>
    </Card>
  )
}

const MENTIONS = ['alice', 'bob', 'carol']

function CaretDemo() {
  const [text, setText] = useState('')
  const [ref, caret] = useCaretPosition()
  const query = /@(\w*)$/.exec(text)?.[1]
  return (
    <Card hook="useCaretPosition" hint="Type @ anywhere in the text: the popup follows the caret.">
      <textarea
        ref={ref}
        rows={3}
        className="caret-field"
        data-testid="caret-field"
        placeholder="Say hi to @…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Value id="caret">
        {caret ? `caret at ${Math.round(caret.left)}, ${Math.round(caret.top)}` : 'not focused'}
      </Value>
      {query !== undefined && caret && (
        <ul
          className="mentions"
          data-testid="mention-popup"
          style={{ top: caret.top + caret.height, left: caret.left }}
        >
          {MENTIONS.filter((name) => name.startsWith(query)).map((name) => (
            <li key={name}>@{name}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function AnnounceDemo() {
  const announce = useAnnounce()
  const [items, setItems] = useState(0)
  const [said, setSaid] = useState('')
  const say = (message: string, politeness?: 'assertive') => {
    announce(message, politeness)
    setSaid(message)
  }
  return (
    <Card hook="useAnnounce" hint="Turn on a screen reader (VoiceOver: ⌘F5), then press a button.">
      <div className="row">
        <button
          type="button"
          data-testid="announce-add"
          onClick={() => {
            setItems(items + 1)
            say(`Added to cart. ${items + 1} items.`)
          }}
        >
          Add to cart
        </button>
        <button
          type="button"
          data-testid="announce-error"
          onClick={() => say('Payment failed.', 'assertive')}
        >
          Fail payment
        </button>
      </div>
      <Value id="announced">screen readers hear: {said || '—'}</Value>
    </Card>
  )
}

function MediaRecorderDemo() {
  const [on, setOn] = useState(false)
  const { stream, error } = useUserMedia({ audio: true }, { enabled: on })
  const recorder = useMediaRecorder(stream)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  const stop = async () => {
    const blob = await recorder.stop()
    if (blob) setUrl(URL.createObjectURL(blob))
    setOn(false)
  }
  return (
    <Card
      hook="useMediaRecorder"
      hint="Record a few seconds from your microphone, then play it back."
    >
      {recorder.recording ? (
        <button type="button" data-testid="record-stop" onClick={stop}>
          Stop
        </button>
      ) : stream ? (
        <button type="button" data-testid="record-start" onClick={recorder.start}>
          Record
        </button>
      ) : (
        <button type="button" data-testid="record-mic" onClick={() => setOn(true)}>
          Use microphone
        </button>
      )}
      <Value id="recording">
        {error
          ? `error: ${error.name}`
          : recorder.recording
            ? `recording (${recorder.mimeType})`
            : recorder.blob
              ? `recorded ${recorder.blob.size} bytes as ${recorder.blob.type}`
              : 'nothing recorded'}
      </Value>
      {url && <audio controls src={url} />}
    </Card>
  )
}

const READ_ALOUD =
  'React tils renders the right first frame. Hooks read browser state without hydration mismatches, and clean up after themselves.'

function SpeechDemo() {
  const { supported, voices, speaking, speak, cancel } = useSpeechSynthesis()
  return (
    <Card hook="useSpeechSynthesis" hint="Reads the sentence below aloud.">
      <p className="quote">{READ_ALOUD}</p>
      {speaking ? (
        <button type="button" data-testid="speech-stop" onClick={cancel}>
          Stop
        </button>
      ) : (
        <button
          type="button"
          data-testid="speech-start"
          disabled={!supported}
          onClick={() => speak(READ_ALOUD)}
        >
          Read aloud
        </button>
      )}
      <Value id="speech">
        {supported
          ? `${voices.length} voices · ${speaking ? 'speaking' : 'quiet'}`
          : 'not supported'}
      </Value>
    </Card>
  )
}

function ServiceWorkerDemo() {
  const { updateAvailable, update } = useServiceWorkerUpdate()
  return (
    <Card
      hook="useServiceWorkerUpdate"
      hint="This demo has no service worker, so there is never an update."
    >
      <Value id="sw-update">update available: {updateAvailable ? 'yes' : 'no'}</Value>
      {updateAvailable && (
        <button type="button" onClick={update}>
          Reload
        </button>
      )}
    </Card>
  )
}

function ScrollProgressDemo({ progress }: { progress: number }) {
  return (
    <Card hook="useScrollProgress" hint="Scroll the page: the bar in the status bar fills up.">
      <Value id="progress">read: {Math.round(progress * 100)}%</Value>
    </Card>
  )
}

function CookieDemo() {
  const [theme, setTheme, removeTheme] = useCookie('demo-theme')
  return (
    <Card
      hook="useCookie"
      hint="Set it, then reload: the cookie is still there, and sent to the server too."
    >
      <div className="row">
        <button
          type="button"
          data-testid="cookie-dark"
          onClick={() => setTheme('dark', { maxAgeSeconds: 3600 })}
        >
          dark
        </button>
        <button
          type="button"
          data-testid="cookie-light"
          onClick={() => setTheme('light', { maxAgeSeconds: 3600 })}
        >
          light
        </button>
        <button type="button" data-testid="cookie-remove" onClick={() => removeTheme()}>
          remove
        </button>
      </div>
      <Value id="cookie">demo-theme: {theme ?? 'not set'}</Value>
    </Card>
  )
}

function DeviceOrientationDemo() {
  const { orientation, needsPermission, requestPermission } = useDeviceOrientation()
  return (
    <Card hook="useDeviceOrientation" hint="On a phone, tilt it. Laptops usually have no sensor.">
      {needsPermission ? (
        <button type="button" data-testid="orientation-allow" onClick={requestPermission}>
          Enable tilt
        </button>
      ) : (
        <div
          className="tilt"
          style={{ transform: `rotate(${Math.round(orientation?.gamma ?? 0)}deg)` }}
          aria-hidden="true"
        >
          ⬆
        </div>
      )}
      <Value id="orientation">
        {orientation
          ? `alpha ${Math.round(orientation.alpha ?? 0)} · beta ${Math.round(orientation.beta ?? 0)} · gamma ${Math.round(orientation.gamma ?? 0)}`
          : needsPermission
            ? 'needs permission'
            : 'no readings'}
      </Value>
    </Card>
  )
}

function SpeechRecognitionDemo() {
  const speech = useSpeechRecognition()
  return (
    <Card hook="useSpeechRecognition" hint="Click and speak. Chrome, Edge, and Safari.">
      <button
        type="button"
        data-testid="dictate"
        disabled={!speech.supported}
        onClick={speech.listening ? speech.stop : speech.start}
      >
        {speech.listening ? 'Stop' : 'Dictate'}
      </button>
      <Value id="dictation">
        {!speech.supported
          ? 'not supported'
          : speech.error
            ? `error: ${speech.error}`
            : `${speech.transcript} ${speech.interim}`.trim() ||
              (speech.listening ? 'listening…' : '—')}
      </Value>
    </Card>
  )
}

// Sidebar and page order. Each card lists its hooks; most show one, a few show two together.
const CATEGORIES: { title: string; cards: string[][] }[] = [
  {
    title: 'Viewport and media',
    cards: [
      ['useMediaQuery'],
      ['useWindowSize'],
      ['useVisualViewport'],
      ['useWindowScroll'],
      ['useScrollDirection'],
      ['useScrollSpy'],
      ['useScrollProgress'],
    ],
  },
  {
    title: 'Elements',
    cards: [
      ['useElementSize'],
      ['useElementScroll'],
      ['useInView'],
      ['useIsStuck'],
      ['useStickToBottom'],
      ['useMergedRefs'],
    ],
  },
  {
    title: 'Storage and URL',
    cards: [
      ['useLocalStorage', 'useSessionStorage'],
      ['useCookie'],
      ['useHash'],
      ['useSearchParam'],
      ['useBroadcastChannel'],
    ],
  },
  {
    title: 'Page, device, and user',
    cards: [
      ['useOnline'],
      ['useNetworkInformation'],
      ['useDocumentVisibility', 'useWindowFocus'],
      ['useIdle'],
      ['usePreferredLanguages'],
      ['usePermission', 'useGeolocation'],
      ['useHydrated'],
      ['useNow'],
      ['usePageRestore'],
      ['useDeviceOrientation'],
    ],
  },
  {
    title: 'Events and input',
    cards: [
      ['useEventListener'],
      ['useClickOutside'],
      ['useHotkey'],
      ['useLongPress'],
      ['useSwipe'],
      ['useDrag'],
      ['usePointerPosition'],
      ['useFileDrop'],
      ['usePasteFiles'],
      ['useTextSelection'],
      ['useRovingFocus'],
      ['useFocusTrap'],
      ['useFocusWithin'],
      ['useAutosizeTextarea'],
      ['useCaretPosition'],
    ],
  },
  {
    title: 'Timers',
    cards: [
      ['useInterval'],
      ['useTimeout'],
      ['useDebouncedCallback'],
      ['useDebouncedValue'],
      ['useThrottledCallback'],
      ['useAnimationFrame'],
    ],
  },
  {
    title: 'Browser APIs',
    cards: [
      ['useCopyToClipboard'],
      ['useShare'],
      ['useFullscreen'],
      ['useWakeLock'],
      ['useUserMedia'],
      ['useMediaRecorder'],
      ['useSpeechSynthesis'],
      ['useSpeechRecognition'],
      ['useEventSource'],
      ['useScript'],
      ['useServiceWorkerUpdate'],
      ['useScrollLock'],
      ['useBeforeUnload'],
    ],
  },
  {
    title: 'Component helpers',
    cards: [['useControllableState'], ['useAnnounce'], ['usePrevious']],
  },
]
export const IDS = CATEGORIES.flatMap((category) => category.cards.flat())

// Their demos read the page's status bar or footer, so their pages show those too.
const PAGE_DEMOS = new Set([
  'useScrollDirection',
  'useScrollSpy',
  'useScrollProgress',
  'useInView',
  'useIsStuck',
])

/** The hook a path like `hooks/useHash/` is the page of, or null for the home page. */
export function pageHook(path: string): string | null {
  const hook = /^hooks\/(use\w+)\/?$/.exec(path)?.[1]
  return hook && IDS.includes(hook) ? hook : null
}

function HookPage({ hook, demo }: { hook: string; demo: ReactNode }) {
  const doc = hookDoc(hook)
  const index = IDS.indexOf(hook)
  const [previous, next] = [IDS[index - 1], IDS[index + 1]]
  const category = CATEGORIES.find((c) => c.cards.flat().includes(hook))!.title
  return (
    <article className="doc" data-testid="hook-page">
      <p className="crumb">
        <a href={BASE}>All hooks</a> / {category}
      </p>
      <h1>
        <code>{hook}</code>
      </h1>
      <p className="meta">
        {doc.size && <span data-testid="hook-size">{doc.size} minified and brotlied</span>}
        <a href={`${REPO}/blob/main/src/${hook}.ts`}>Source</a>
      </p>
      {doc.description.map((paragraph) => (
        <p key={paragraph}>
          <Prose text={paragraph} />
        </p>
      ))}

      <h2>Import</h2>
      <pre className="code">
        <code>{`import { ${hook} } from '${PACKAGE}'\n// or only this hook\nimport { ${hook} } from '${PACKAGE}/${hook}'`}</code>
      </pre>

      <h2>Usage</h2>
      <pre className="code" data-testid="hook-example">
        <code>{doc.example}</code>
      </pre>

      <h2>Live demo</h2>
      <OnHookPage.Provider value>{demo}</OnHookPage.Provider>

      <h2>When to use it</h2>
      <p>
        <Prose text={doc.useWhen} />
      </p>
      {doc.dontUseWhen && (
        <>
          <h2>When not to</h2>
          <p>
            <Prose text={doc.dontUseWhen} />
          </p>
        </>
      )}

      <h2>API</h2>
      <pre className="code signature" data-testid="hook-signature">
        <code>{doc.signature}</code>
      </pre>
      {doc.params.length > 0 && (
        <table className="params">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {doc.params.map((param) => (
              <tr key={param.name}>
                <td>
                  <code>{param.name}</code>
                </td>
                <td>
                  <Prose text={param.text} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {doc.returns && (
        <p>
          <strong>Returns</strong> <Prose text={doc.returns} />
        </p>
      )}
      {doc.types && (
        <>
          <h3>Types</h3>
          <pre className="code">
            <code>{doc.types}</code>
          </pre>
        </>
      )}

      {doc.aliases && (
        <>
          <h2>Coming from another library?</h2>
          <p>
            Other libraries call this <Prose text={doc.aliases} />.
          </p>
        </>
      )}

      <nav className="pager" aria-label="Previous and next hook">
        {previous ? <a href={hookUrl(previous)}>← {previous}</a> : <span />}
        {next && <a href={hookUrl(next)}>{next} →</a>}
      </nav>
    </article>
  )
}

export function App({ path }: { path: string }) {
  const current = pageHook(path)
  const [inViewRef, inView] = useInView<HTMLDivElement>()
  const direction = useScrollDirection()
  const [stuckRef, stuck] = useIsStuck<HTMLParagraphElement>()
  // Below the sticky status bar.
  const active = useScrollSpy(IDS, { offset: 80 })
  const [mainRef, progress] = useScrollProgress<HTMLElement>()

  // Each card's demo, keyed by its first hook.
  const demos: Record<string, ReactNode> = {
    useMediaQuery: <MediaQueryDemo />,
    useWindowSize: <WindowSizeDemo />,
    useVisualViewport: <VisualViewportDemo />,
    useWindowScroll: <WindowScrollDemo />,
    useScrollDirection: <ScrollDirectionCard direction={direction} />,
    useScrollSpy: <ScrollSpyDemo active={active} />,
    useScrollProgress: <ScrollProgressDemo progress={progress} />,
    useElementSize: <ElementSizeDemo />,
    useElementScroll: <ElementScrollDemo />,
    useInView: <InViewCard inView={inView} />,
    useIsStuck: <IsStuckDemo stuck={stuck} />,
    useStickToBottom: <StickToBottomDemo />,
    useMergedRefs: <MergedRefsDemo />,
    useLocalStorage: <StorageDemo />,
    useCookie: <CookieDemo />,
    useHash: <HashDemo />,
    useSearchParam: <SearchParamDemo />,
    useBroadcastChannel: <BroadcastDemo />,
    useOnline: <OnlineDemo />,
    useNetworkInformation: <NetworkDemo />,
    useDocumentVisibility: <VisibilityDemo />,
    useIdle: <IdleDemo />,
    usePreferredLanguages: <LanguageDemo />,
    usePermission: <GeolocationDemo />,
    useHydrated: <HydratedDemo />,
    useNow: <NowDemo />,
    usePageRestore: <PageRestoreDemo />,
    useDeviceOrientation: <DeviceOrientationDemo />,
    useEventListener: <EventListenerDemo />,
    useClickOutside: <ClickOutsideDemo />,
    useHotkey: <HotkeyDemo />,
    useLongPress: <LongPressDemo />,
    useSwipe: <SwipeDemo />,
    usePointerPosition: <PointerPositionDemo />,
    useDrag: <DragDemo />,
    useFileDrop: <FileDropDemo />,
    usePasteFiles: <PasteFilesDemo />,
    useTextSelection: <TextSelectionDemo />,
    useRovingFocus: <RovingFocusDemo />,
    useFocusWithin: <FocusWithinDemo />,
    useEventSource: <EventSourceDemo />,
    useFocusTrap: <FocusTrapDemo />,
    useAutosizeTextarea: <AutosizeDemo />,
    useCaretPosition: <CaretDemo />,
    useInterval: <IntervalDemo />,
    useTimeout: <TimeoutDemo />,
    useDebouncedCallback: <DebounceDemo />,
    useDebouncedValue: <DebouncedValueDemo />,
    useThrottledCallback: <ThrottleDemo />,
    useAnimationFrame: <AnimationFrameDemo />,
    useCopyToClipboard: <CopyDemo />,
    useShare: <ShareDemo />,
    useFullscreen: <FullscreenDemo />,
    useWakeLock: <WakeLockDemo />,
    useUserMedia: <UserMediaDemo />,
    useMediaRecorder: <MediaRecorderDemo />,
    useSpeechSynthesis: <SpeechDemo />,
    useSpeechRecognition: <SpeechRecognitionDemo />,
    useScript: <ScriptDemo />,
    useServiceWorkerUpdate: <ServiceWorkerDemo />,
    useScrollLock: <ScrollLockDemo />,
    useBeforeUnload: <BeforeUnloadDemo />,
    useControllableState: <ControllableDemo />,
    useAnnounce: <AnnounceDemo />,
    usePrevious: <PreviousDemo />,
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <a className="brand" href={BASE}>
          react-tils
        </a>
        <nav aria-label="Hooks">
          {CATEGORIES.map((category) => (
            <div key={category.title} className="nav-group">
              <h2>{category.title}</h2>
              <ul>
                {category.cards.flat().map((hook) => (
                  <li key={hook}>
                    <a
                      href={hookUrl(hook)}
                      data-testid={`nav-${hook}`}
                      aria-current={
                        current === hook
                          ? 'page'
                          : !current && active === hook
                            ? 'location'
                            : undefined
                      }
                    >
                      {hook}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main id="top" ref={mainRef}>
        {!current && (
          <header>
            <h1>react-tils</h1>
            <p>
              {IDS.length} React hooks for browser state, correct on the first frame. Every example
              below is server-rendered at build time and hydrated in your browser. Click a hook's
              name for its full documentation.
            </p>
          </header>
        )}
        {(!current || PAGE_DEMOS.has(current)) && (
          <p ref={stuckRef} className={stuck ? 'sticky-status stuck' : 'sticky-status'}>
            Scrolling <Value id="scroll-direction">{direction}</Value> · bottom of page in view:{' '}
            <Value id="inview">{inView ? 'yes' : 'no'}</Value>
            <span className="read-progress" style={{ transform: `scaleX(${progress})` }} />
          </p>
        )}
        {current ? (
          <HookPage
            hook={current}
            demo={
              demos[CATEGORIES.flatMap((c) => c.cards).find((card) => card.includes(current))![0]!]
            }
          />
        ) : (
          CATEGORIES.map((category) => (
            <section key={category.title} className="category">
              <h2 className="group">{category.title}</h2>
              {category.cards.map((card) => (
                <Fragment key={card[0]}>{demos[card[0]!]}</Fragment>
              ))}
            </section>
          ))
        )}
        {(!current || PAGE_DEMOS.has(current)) && (
          <footer>
            <div ref={inViewRef} className="sentinel" data-testid="inview-target" />
            <p>
              You reached the bottom: <code>useInView</code> in the status bar says yes.
            </p>
          </footer>
        )}
      </main>
    </div>
  )
}
