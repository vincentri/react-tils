// Generates llms.txt from the built type declarations, so it always matches the shipped JSDoc.
// Run after `pnpm build`. Output: demo/public/llms.txt (served at the demo site root).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

// From scripts/browser-support.ts (run it first): what each hook needs from the browser.
type Api = { label: string; support: Record<string, string>; optional: boolean }
const support = JSON.parse(
  readFileSync(new URL('../demo/src/browser-support.json', import.meta.url), 'utf8'),
) as { hooks: Record<string, { apis: Api[]; notes: string[] }> }
const NAMES: Record<string, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
  chrome_android: 'Chrome Android',
  safari_ios: 'Safari iOS',
}
function supportLine(hook: string): string {
  const entry = support.hooks[hook]
  if (!entry) return ''
  const missing = Object.keys(NAMES)
    .filter((b) => entry.apis.some((api) => !api.optional && !api.support[b]))
    .map((b) => NAMES[b])
  const summary =
    missing.length > 0 ? `not available in ${missing.join(', ')}` : 'all modern browsers'
  return `\n\nBrowser support: ${summary}.${entry.notes.map((note) => ` ${note}`).join('')}`
}

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
  name: string
  description: string
  homepage: string
}

const unJsdoc = (comment: string) =>
  comment
    .replace(/^\/\*\*\s*\n?/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, ''))
    .join('\n')
    .trim()

const sections: string[] = []
const files = readdirSync(dist).filter((f) => /^use\w+\.d\.ts$/.test(f) || f === 'testing.d.ts')
for (const file of files.toSorted()) {
  const source = readFileSync(new URL(file, dist), 'utf8')
  for (const match of source.matchAll(
    // The JSDoc right before each function: a /** ... */ block that doesn't span another `*/`.
    /(\/\*\*(?:(?!\*\/)[\s\S])*\*\/)\s*(?:export )?declare function (\w+)([\s\S]*?);\n/g,
  )) {
    const [, doc, name, signature] = match
    const entry = file === 'testing.d.ts' ? `${pkg.name}/testing` : pkg.name
    const page = name.startsWith('use')
      ? `${supportLine(name)}\n\nDocs: ${pkg.homepage}hooks/${name}/`
      : ''
    sections.push(
      `## ${name}\n\n\`\`\`ts\nimport { ${name} } from '${entry}'\nfunction ${name}${signature!.trim()}\n\`\`\`\n\n${unJsdoc(doc!)}${page}`,
    )
  }
}

if (sections.length === 0) throw new Error('No declarations found. Run `pnpm build` first.')

const agents = readFileSync(new URL('AGENTS.md', root), 'utf8')
const text = `# ${pkg.name}

> ${pkg.description}

Install: \`npm install ${pkg.name}\`. Every hook renders on the server, hydrates without mismatch, and cleans up after itself.

${agents.slice(agents.indexOf('## Pick a hook'), agents.indexOf('## Writing your own hook')).trim()}

# API

${sections.join('\n\n')}
`

mkdirSync(new URL('demo/public/', root), { recursive: true })
writeFileSync(new URL('demo/public/llms.txt', root), text)
console.log(`llms.txt: ${sections.length} functions`)
