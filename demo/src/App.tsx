import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  useAnimationFrame,
  useBeforeUnload,
  useBroadcastChannel,
  useClickOutside,
  useControllableState,
  useCopyToClipboard,
  useDebouncedCallback,
  useDebouncedValue,
  useDocumentVisibility,
  useElementSize,
  useElementScroll,
  useEventListener,
  useFileDrop,
  useFocusTrap,
  useFullscreen,
  useGeolocation,
  useHash,
  useHotkey,
  useHydrated,
  useIdle,
  useInterval,
  useInView,
  useLocalStorage,
  useLongPress,
  useMergedRefs,
  useMediaQuery,
  useNetworkInformation,
  useNow,
  useOnline,
  usePermission,
  usePreferredLanguages,
  useRovingFocus,
  useScript,
  useScrollDirection,
  useScrollLock,
  useSessionStorage,
  useShare,
  useStickToBottom,
  useSwipe,
  useTextSelection,
  useTimeout,
  useUserMedia,
  useVisualViewport,
  useWakeLock,
  useWindowFocus,
  useWindowScroll,
  useWindowSize,
} from '@vincent.ri/react-tils'

function Card({ hook, hint, children }: { hook: string; hint: string; children: ReactNode }) {
  return (
    <section className="card" data-hook={hook}>
      <h2>
        <code>{hook}</code>
      </h2>
      <p className="hint">{hint}</p>
      <div className="body">{children}</div>
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

function InViewDemo({ target }: { target: (el: HTMLDivElement | null) => void }) {
  return <div ref={target} className="sentinel" data-testid="inview-target" />
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
  return (
    <Card hook="useHotkey" hint="Press ⌘K / Ctrl+K, then Escape.">
      <Value id="palette">{open ? 'palette open' : 'palette closed'}</Value>
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
    <Card hook="useRovingFocus" hint="Tab into the toolbar, then use the arrow keys.">
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

export function App() {
  const [inViewRef, inView] = useInView<HTMLDivElement>()
  const direction = useScrollDirection()
  return (
    <main>
      <header>
        <h1>react-tils</h1>
        <p>
          Every card below is server-rendered at build time and hydrated in your browser. Values
          update live.
        </p>
        <p className="sticky-status">
          Scrolling <Value id="scroll-direction">{direction}</Value> · bottom of page in view:{' '}
          <Value id="inview">{inView ? 'yes' : 'no'}</Value>
        </p>
      </header>
      <h2 className="group">Browser state</h2>
      <div className="grid">
        <MediaQueryDemo />
        <WindowSizeDemo />
        <WindowScrollDemo />
        <ElementSizeDemo />
        <ElementScrollDemo />
        <OnlineDemo />
        <VisibilityDemo />
        <HydratedDemo />
        <StorageDemo />
        <LanguageDemo />
        <GeolocationDemo />
        <IdleDemo />
        <VisualViewportDemo />
        <NetworkDemo />
        <NowDemo />
        <HashDemo />
      </div>
      <h2 className="group">Events and interaction</h2>
      <div className="grid">
        <EventListenerDemo />
        <ClickOutsideDemo />
        <HotkeyDemo />
        <CopyDemo />
        <ShareDemo />
        <ScrollLockDemo />
        <BeforeUnloadDemo />
        <IntervalDemo />
        <TimeoutDemo />
        <ScriptDemo />
        <FullscreenDemo />
        <WakeLockDemo />
        <BroadcastDemo />
        <FileDropDemo />
        <LongPressDemo />
        <UserMediaDemo />
        <DebounceDemo />
        <DebouncedValueDemo />
        <StickToBottomDemo />
        <RovingFocusDemo />
        <ControllableDemo />
        <TextSelectionDemo />
        <FocusTrapDemo />
        <SwipeDemo />
        <AnimationFrameDemo />
        <MergedRefsDemo />
      </div>
      <footer>
        <InViewDemo target={inViewRef} />
        <p>
          <code>useInView</code>: you reached the bottom.
        </p>
      </footer>
    </main>
  )
}
