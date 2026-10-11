import support from './browser-support.json'
import { Prose } from './chrome'

const BROWSERS = [
  ['chrome', 'Chrome'],
  ['edge', 'Edge'],
  ['firefox', 'Firefox'],
  ['safari', 'Safari'],
  ['chrome_android', 'Chrome Android'],
  ['safari_ios', 'Safari iOS'],
] as const

type Api = {
  label: string
  key: string
  baseline: 'high' | 'low' | false
  support: Partial<Record<string, string>>
  optional: boolean
}
const hooks = support.hooks as Record<string, { apis: Api[]; notes: string[] }>

/** One line for the top of a hook's page: does it work everywhere? */
export function supportSummary(hook: string): { level: 'all' | 'new' | 'limited'; text: string } {
  const required = (hooks[hook]?.apis ?? []).filter((api) => !api.optional)
  const missing = BROWSERS.filter(([id]) => required.some((api) => !api.support[id])).map(
    ([, name]) => name,
  )
  if (missing.length > 0)
    return { level: 'limited', text: `Not available in ${missing.join(', ')}` }
  if (required.some((api) => api.baseline === 'low'))
    return { level: 'new', text: 'Newly available: needs recent browser versions' }
  return { level: 'all', text: 'Works in all modern browsers' }
}

export function SupportBadge({ hook }: { hook: string }) {
  const { level, text } = supportSummary(hook)
  return (
    <a href="#browser-support" className={`support-badge ${level}`} data-testid="support-badge">
      {level === 'all' ? '✓' : level === 'new' ? '●' : '!'} {text}
    </a>
  )
}

const BASELINE = { high: 'Widely available', low: 'Newly available' } as const

export function BrowserSupport({ hook }: { hook: string }) {
  const { apis = [], notes = [] } = hooks[hook] ?? {}
  return (
    <section data-testid="browser-support">
      <h2 id="browser-support">Browser support</h2>
      {apis.length === 0 ? (
        <p>Uses only long-established browser features, so it works wherever React does.</p>
      ) : (
        <div className="support-table-wrap">
          <table className="support-table">
            <thead>
              <tr>
                <th>Uses</th>
                {BROWSERS.map(([id, name]) => (
                  <th key={id}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apis.map((api) => (
                <tr key={api.key}>
                  <th scope="row">
                    {api.label}
                    {api.optional && <span className="optional">optional</span>}
                    <span className={`baseline ${api.baseline || 'limited'}`}>
                      {api.baseline ? BASELINE[api.baseline] : 'Limited availability'}
                    </span>
                  </th>
                  {BROWSERS.map(([id, name]) => {
                    const version = api.support[id]
                    return (
                      <td
                        key={id}
                        className={version ? 'yes' : 'no'}
                        aria-label={`${name}: ${version ? `${version} and later` : 'not supported'}`}
                      >
                        {version ? `${version}+` : '✕'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notes.length > 0 && (
        <ul className="support-notes">
          {notes.map((note) => (
            <li key={note}>
              <Prose text={note} />
            </li>
          ))}
        </ul>
      )}
      {apis.some((api) => api.optional) && (
        <p className="support-source">
          Optional features are used when present; without them the hook still works.
        </p>
      )}
      <p className="support-source">
        First version with support, from MDN's compatibility data ({support.source}).
      </p>
    </section>
  )
}
