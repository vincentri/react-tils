// Each hook's documentation, read from its source JSDoc and its built type declarations, so the
// site can't drift from what ships. Declarations exist after `pnpm build` (demo:build runs it).
const sources = import.meta.glob(['../../src/use*.ts', '!../../src/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const declarations = import.meta.glob('../../dist/use*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const readme = Object.values(
  import.meta.glob('../../README.md', { query: '?raw', import: 'default', eager: true }),
)[0] as string

export const PACKAGE = '@vincent.ri/react-tils'
export const REPO = 'https://github.com/vincentri/react-tils'

export type HookDoc = {
  name: string
  /** Paragraphs before "Use when", and any after "Don't use when" that aren't tags. */
  description: string[]
  useWhen: string
  dontUseWhen: string
  /** "Other libraries call this …", without the lead-in. */
  aliases: string
  params: { name: string; text: string }[]
  returns: string
  example: string
  /** `function useX(…): …` from the declarations. */
  signature: string
  /** The exported types declared next to the hook, with their field comments. */
  types: string
  /** Minified and brotlied, from the README tables. */
  size: string
}

const unJsdoc = (comment: string) => comment.split('\n').map((line) => line.replace(/^\s*\* ?/, ''))

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const join = (lines: string[]) => lines.join(' ').replace(/\s+/g, ' ').trim()

const cache = new Map<string, HookDoc>()

export function hookDoc(name: string): HookDoc {
  const cached = cache.get(name)
  if (cached) return cached
  const source = sources[`../../src/${name}.ts`] ?? ''
  const match = new RegExp(
    `/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export function ${name}[<(]`,
  ).exec(source)
  const lines = match ? unJsdoc(match[1]!) : []

  // Prose up to the first tag, in blank-line-separated paragraphs; then the tags.
  const firstTag = lines.findIndex((line) => line.startsWith('@'))
  const prose = (firstTag === -1 ? lines : lines.slice(0, firstTag)).join('\n')
  const paragraphs = prose
    .split(/\n\s*\n/)
    .map((p) => p.split('\n'))
    .filter((p) => p.some((line) => line.trim()))

  const doc: HookDoc = {
    name,
    description: [],
    useWhen: '',
    dontUseWhen: '',
    aliases: '',
    params: [],
    returns: '',
    example: '',
    signature: '',
    types: '',
    size: '',
  }
  for (const paragraph of paragraphs) {
    const text = join(paragraph)
    if (text.startsWith('Use when:')) {
      const [use, dont = ''] = text.split("Don't use when:")
      doc.useWhen = capitalize(use!.replace('Use when:', '').trim())
      doc.dontUseWhen = capitalize(dont.trim())
    } else if (text.startsWith('Other libraries call this')) {
      doc.aliases = text.replace(/^Other libraries call this:?\s*/, '').replace(/\.$/, '')
    } else doc.description.push(text)
  }

  // Tags: each runs until the next tag. @example keeps its line breaks.
  const tags = firstTag === -1 ? [] : lines.slice(firstTag)
  let current: { tag: string; lines: string[] } | null = null
  const flush = () => {
    if (!current) return
    const { tag, lines: body } = current
    if (tag === 'example') doc.example = body.join('\n').trim()
    else if (tag === 'returns') doc.returns = join(body)
    else if (tag === 'param') {
      const [, param = '', text = ''] = /^(\S+)\s*-?\s*([\s\S]*)$/.exec(join(body)) ?? []
      doc.params.push({ name: param, text })
    }
  }
  for (const line of tags) {
    const tag = /^@(\w+)\s?(.*)$/.exec(line)
    if (tag) {
      flush()
      current = { tag: tag[1]!, lines: [tag[2]!] }
    } else current?.lines.push(line)
  }
  flush()

  // The declarations: the function's signature, and everything else that isn't the function.
  const dts = declarations[`../../dist/${name}.d.ts`] ?? ''
  const fn = new RegExp(
    `(?:/\\*\\*(?:(?!\\*/)[\\s\\S])*\\*/\\s*)?export declare function ${name}([\\s\\S]*?);\\n(?=//#endregion|export |declare |$)`,
  ).exec(dts)
  if (fn) doc.signature = `function ${name}${fn[1]!.trim()}`
  doc.types = dts
    .replace(fn?.[0] ?? '', '')
    .replace(/^(\/\/#(end)?region.*|import .*|export \{.*\};?)$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Table cells may contain escaped pipes (`delayMs \\| null`).
  const cell = '(?:\\\\\\||[^|])*'
  const row = new RegExp(`\\| \\[?\`${name}\\(${cell}\\|${cell}\\| ([\\d.]+ k?B) +\\|`).exec(readme)
  doc.size = row?.[1] ?? ''
  cache.set(name, doc)
  return doc
}

/** The first sentence, for meta descriptions and the home page's list. */
export const summary = (doc: HookDoc) =>
  (doc.description[0] ?? '').replace(/`/g, '').split(/(?<=\.)\s/)[0] ?? ''
