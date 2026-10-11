// Generates demo/src/browser-support.json: for each hook, the browser APIs its code calls (found by
// scanning its source and the local modules it imports) and which browsers support each, from
// MDN's compatibility data via web-features. Run by `pnpm demo:build`; `pnpm docs:support` alone.
// Versions are never written by hand: update the data by updating those two packages.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import bcd from '@mdn/browser-compat-data' with { type: 'json' }
import data from 'web-features/data.json' with { type: 'json' }

const root = new URL('../', import.meta.url)
const src = new URL('src/', root)

export const BROWSERS = ['chrome', 'edge', 'firefox', 'safari', 'chrome_android', 'safari_ios']

// What to look for in a hook's code (comments removed), and the MDN compat key it means.
const APIS: [RegExp, string, string][] = [
  [/\bmatchMedia\b/, 'api.Window.matchMedia', 'matchMedia'],
  [/\blocalStorage\b|'localStorage'/, 'api.Window.localStorage', 'localStorage'],
  [/\bsessionStorage\b|'sessionStorage'/, 'api.Window.sessionStorage', 'sessionStorage'],
  [/'storage'/, 'api.Window.storage_event', 'storage event'],
  [/document\.cookie/, 'api.Document.cookie', 'document.cookie'],
  [/\bcookieStore\b/, 'api.CookieStore', 'Cookie Store API'],
  [/'hashchange'/, 'api.Window.hashchange_event', 'hashchange event'],
  [/\b(push|replace)State\b/, 'api.History.pushState', 'history.pushState'],
  [/'popstate'/, 'api.Window.popstate_event', 'popstate event'],
  [/\.navigation\b/, 'api.Navigation', 'Navigation API'],
  [/\bURLSearchParams\b|\.searchParams\b/, 'api.URLSearchParams', 'URLSearchParams'],
  [/\bnew URL\(/, 'api.URL', 'URL'],
  [/\bBroadcastChannel\b/, 'api.BroadcastChannel', 'BroadcastChannel'],
  [/navigator\.onLine/, 'api.Navigator.onLine', 'navigator.onLine'],
  [/visibilityState|'visibilitychange'/, 'api.Document.visibilityState', 'Page Visibility'],
  [/navigator\.languages?\b/, 'api.Navigator.languages', 'navigator.languages'],
  [/permissions\??\.query/, 'api.Permissions.query', 'Permissions API'],
  [/\bwatchPosition\b/, 'api.Geolocation.watchPosition', 'Geolocation'],
  [/'pageshow'/, 'api.Window.pageshow_event', 'pageshow event'],
  [/'deviceorientation'/, 'api.Window.deviceorientation_event', 'deviceorientation event'],
  [
    /\brequestPermission\b/,
    'api.DeviceOrientationEvent.requestPermission_static',
    'DeviceOrientationEvent.requestPermission',
  ],
  [
    /'pointer(down|move|up|cancel|enter|leave)'|\bonPointer(Down|Move|Up|Cancel|Leave)\b/,
    'api.PointerEvent',
    'Pointer events',
  ],
  [/\bsetPointerCapture\b/, 'api.Element.setPointerCapture', 'setPointerCapture'],
  [/'touch(start|move|end)'/, 'api.Element.touchstart_event', 'Touch events'],
  [/'wheel'/, 'api.Element.wheel_event', 'wheel event'],
  [/\bdataTransfer\b/, 'api.DataTransfer.files', 'Drag and drop files'],
  [/'paste'/, 'api.Element.paste_event', 'paste event'],
  [/\bgetSelection\b/, 'api.Window.getSelection', 'getSelection'],
  [/'selectionchange'/, 'api.Document.selectionchange_event', 'selectionchange event'],
  [/\brequestAnimationFrame\b/, 'api.Window.requestAnimationFrame', 'requestAnimationFrame'],
  [/clipboard\.writeText/, 'api.Clipboard.writeText', 'clipboard.writeText'],
  [/navigator\.share\b/, 'api.Navigator.share', 'Web Share API'],
  [/navigator\.canShare\b/, 'api.Navigator.canShare', 'navigator.canShare'],
  [/\brequestFullscreen\b/, 'api.Element.requestFullscreen', 'Fullscreen API'],
  [/\bwakeLock\b/, 'api.WakeLock', 'Screen Wake Lock API'],
  [/\bgetUserMedia\b/, 'api.MediaDevices.getUserMedia', 'getUserMedia'],
  [/\bMediaRecorder\b/, 'api.MediaRecorder', 'MediaRecorder'],
  [/\bspeechSynthesis\b/, 'api.SpeechSynthesis', 'Speech synthesis'],
  [/\bSpeechRecognition\b/, 'api.SpeechRecognition', 'Speech recognition'],
  [/\bserviceWorker\b/, 'api.ServiceWorkerContainer', 'Service workers'],
  [/\bEventSource\b/, 'api.EventSource', 'EventSource'],
  [/'beforeunload'/, 'api.Window.beforeunload_event', 'beforeunload event'],
  [/\bResizeObserver\b/, 'api.ResizeObserver', 'ResizeObserver'],
  [/\bIntersectionObserver\b/, 'api.IntersectionObserver', 'IntersectionObserver'],
  [/\bvisualViewport\b/, 'api.VisualViewport', 'VisualViewport'],
  [/\bMutationObserver\b/, 'api.MutationObserver', 'MutationObserver'],
  [/\bcheckVisibility\b/, 'api.Element.checkVisibility', 'checkVisibility'],
  [/\.connection\b/, 'api.NetworkInformation', 'Network Information API'],
  [/\[inert\]/, 'api.HTMLElement.inert', 'inert'],
]

// Used when present, with a fallback: missing support degrades a detail, not the hook.
const OPTIONAL: Record<string, string[]> = {
  useHash: ['api.Navigation'],
  useSearchParam: ['api.Navigation'],
  useCookie: ['api.CookieStore'],
  useFocusTrap: ['api.Element.checkVisibility'],
  useRovingFocus: ['api.Element.checkVisibility'],
  useShare: ['api.Navigator.canShare'],
  useStickToBottom: ['api.Element.wheel_event', 'api.Element.touchstart_event'],
  useDeviceOrientation: ['api.DeviceOrientationEvent.requestPermission_static'],
  // Any activity counts; pointer and key events are enough on their own.
  useIdle: ['api.Element.wheel_event', 'api.Element.touchstart_event'],
}

// Matched in a shared module but not used by this hook.
const NOT_USED: Record<string, string[]> = {
  useLocalStorage: ['api.Window.sessionStorage'],
  useSessionStorage: ['api.Window.localStorage'],
}

// Accepted with a vendor prefix too (the hook falls back to it), so prefixed support counts.
const PREFIXED = new Set(['api.SpeechRecognition'])

// What the data can't say: what the hook does without support, and platform caveats.
const NOTES: Record<string, string[]> = {
  useHash: [
    "Router navigation that changes the URL with `history.pushState` (e.g. Next.js `<Link>`) is noticed only where the Navigation API exists. Elsewhere the hash still updates on links, Back and Forward, and the hook's own setter.",
  ],
  useSearchParam: [
    "Router navigation that changes the URL with `history.pushState` (e.g. Next.js `<Link>`) is noticed only where the Navigation API exists. Elsewhere the value still updates on Back and Forward and through the hook's own setter.",
  ],
  useCookie: [
    'Changes made outside the hook are noticed right away where the Cookie Store API exists, and otherwise when the window regains focus.',
  ],
  useSpeechRecognition: [
    'Uses `SpeechRecognition` or its `webkit` prefixed version. Where neither exists (Firefox), `supported` is `false` and `start` does nothing.',
  ],
  useSpeechSynthesis: [
    'Where the API is missing, `supported` is `false`. The voices on offer depend on the browser and operating system.',
  ],
  useShare: [
    'Where `navigator.share` is missing, `supported` is `false` and `share` resolves to `false`; offer `useCopyToClipboard` instead.',
  ],
  useFullscreen: [
    "`supported` is `false` where `document.fullscreenEnabled` isn't true, including on iPhone, where Safari allows fullscreen only for `<video>`.",
  ],
  useWakeLock: [
    "Where the API is missing, `supported` is `false` and the screen follows the device's normal sleep settings.",
  ],
  useNetworkInformation: [
    "Where the API is missing, every field stays unknown: `effectiveType: 'unknown'`, `saveData: false`, and `null` estimates.",
  ],
  useCopyToClipboard: [
    'Needs a secure page (HTTPS or localhost). `copy` resolves to `false` when the browser refuses.',
  ],
  useUserMedia: ['Needs a secure page (HTTPS or localhost).'],
  useGeolocation: ['Needs a secure page (HTTPS or localhost).'],
  useServiceWorkerUpdate: ['Service workers need a secure page (HTTPS or localhost).'],
  useMediaRecorder: [
    'Browsers record different formats (Safari records MP4, others WebM); the hook picks one the browser supports and reports it as `mimeType`.',
  ],
  useDeviceOrientation: [
    'iOS needs `requestPermission()` called from a tap. Desktops usually have no sensor, so `orientation` stays `null`.',
  ],
  useBeforeUnload: [
    "Safari on iOS doesn't fire `beforeunload`, so there is no warning there; save drafts as the user types instead.",
  ],
  usePermission: [
    "Browsers support different permission names; a name the browser doesn't know reports `'unknown'`.",
  ],
}

type Support = Partial<Record<string, string>>
export type Api = {
  label: string
  key: string
  /** `'high'`: widely available; `'low'`: newly available; `false`: not in every major browser. */
  baseline: 'high' | 'low' | false
  /** First version per browser; missing means not supported. */
  support: Support
  optional: boolean
}

type Status = { baseline: 'high' | 'low' | false; support: Support }
const features = (
  data as unknown as {
    features: Record<
      string,
      { compat_features?: string[]; status?: Status & { by_compat_key?: Record<string, Status> } }
    >
  }
).features

function statusOf(key: string): Status {
  if (PREFIXED.has(key)) return fromBcd(key)
  for (const feature of Object.values(features))
    if (feature.compat_features?.includes(key) && feature.status)
      return feature.status.by_compat_key?.[key] ?? feature.status
  return fromBcd(key)
}

// Earliest real version per browser straight from MDN's data, prefixed versions included.
function fromBcd(key: string): Status {
  const node = key.split('.').reduce<any>((at, part) => at?.[part], bcd)
  const raw = node?.['__compat']?.support ?? {}
  const support: Support = {}
  for (const browser of BROWSERS) {
    const entries = [raw[browser]].flat().filter(Boolean)
    const versions = entries
      .filter(
        (e: any) =>
          !e.flags && typeof e.version_added === 'string' && /^[\d.≤]+$/.test(e.version_added),
      )
      .map((e: any) => e.version_added as string)
      .toSorted(
        (a: string, b: string) =>
          Number.parseFloat(a.replace('≤', '')) - Number.parseFloat(b.replace('≤', '')),
      )
    if (versions[0]) support[browser] = versions[0]
  }
  const everywhere = BROWSERS.every((b) => support[b])
  return { baseline: everywhere ? 'high' : false, support }
}

// The hook's own code plus the local modules it imports (not type-only imports).
function code(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return ''
  seen.add(file)
  const text = readFileSync(new URL(file, src), 'utf8')
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
  let all = stripped
  for (const [, path] of stripped.matchAll(/^import (?!type )[^'"]*from '\.\/([\w/]+)'/gm))
    all += `\n${code(`${path}.ts`, seen)}`
  return all
}

const hooks = readdirSync(src)
  .filter((f) => /^use\w+\.ts$/.test(f) && !f.endsWith('.test.ts'))
  .map((f) => f.slice(0, -3))
  .toSorted()

const result: Record<string, { apis: Api[]; notes: string[] }> = {}
for (const hook of hooks) {
  const source = code(`${hook}.ts`)
  const apis = APIS.filter(
    ([pattern, key]) => pattern.test(source) && !NOT_USED[hook]?.includes(key),
  ).map(([, key, label]): Api => {
    const { baseline, support } = statusOf(key)
    return { label, key, baseline, support, optional: OPTIONAL[hook]?.includes(key) ?? false }
  })
  for (const key of OPTIONAL[hook] ?? [])
    if (!apis.some((api) => api.key === key))
      throw new Error(`${hook}: optional ${key} is no longer used; update OPTIONAL`)
  result[hook] = { apis, notes: NOTES[hook] ?? [] }
}
for (const hook of Object.keys(NOTES))
  if (!result[hook]) throw new Error(`NOTES lists ${hook}, which doesn't exist`)

const versions = (name: string) =>
  JSON.parse(readFileSync(new URL(`node_modules/${name}/package.json`, root), 'utf8')).version
writeFileSync(
  new URL('demo/src/browser-support.json', root),
  `${JSON.stringify(
    {
      source: `web-features ${versions('web-features')}, @mdn/browser-compat-data ${versions('@mdn/browser-compat-data')}`,
      hooks: result,
    },
    null,
    2,
  )}\n`,
)
console.log(`browser-support.json: ${hooks.length} hooks`)
