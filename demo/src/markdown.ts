// Each hook's page, as markdown: written next to the prerendered HTML at `hooks/<name>.md`, so an
// agent can fetch one hook's docs instead of the whole llms.txt. Built from the JSDoc and the
// declarations the page itself reads (docs.ts), so the two cannot drift.
import browserSupport from './browser-support.json'
import { hookDoc, PACKAGE, REPO } from './docs'
import { IDS } from './App'
import { supportSummary } from './BrowserSupport'
import pkg from '../../package.json'

const codeBlock = (code: string) => ['```ts', code, '```'].join('\n')
const hooks = browserSupport.hooks as Record<string, { notes: string[] }>

export function hookMarkdown(hook: string): string {
  const doc = hookDoc(hook)
  const index = IDS.indexOf(hook)
  const [previous, next] = [IDS[index - 1], IDS[index + 1]]
  const notes = hooks[hook]?.notes ?? []
  // ends with '/', so every docs URL can be built by appending to it.
  const home = pkg.homepage

  const blocks: string[] = [`# ${hook}`, ...doc.description]

  blocks.push(
    '## Import',
    codeBlock(
      `import { ${hook} } from '${PACKAGE}'\n// or only this hook\nimport { ${hook} } from '${PACKAGE}/${hook}'`,
    ),
    '## Usage',
    codeBlock(doc.example),
  )
  if (doc.useWhen) blocks.push('## When to use it', doc.useWhen)
  if (doc.dontUseWhen) blocks.push('## When not to', doc.dontUseWhen)

  blocks.push('## API', codeBlock(doc.signature))
  if (doc.params.length > 0)
    blocks.push(
      [
        '| Parameter | Description |',
        '| --- | --- |',
        ...doc.params.map((param) => `| \`${param.name}\` | ${param.text.replace(/\|/g, '\\|')} |`),
      ].join('\n'),
    )
  if (doc.returns) blocks.push(`**Returns** ${doc.returns}`)
  if (doc.types) blocks.push('### Types', codeBlock(doc.types))

  blocks.push('## Browser support', `${supportSummary(hook).text}.`)
  if (notes.length > 0) blocks.push(notes.map((note) => `- ${note}`).join('\n'))

  if (doc.aliases)
    blocks.push('## Coming from another library?', `Other libraries call this ${doc.aliases}.`)

  const meta = [
    doc.size && `${doc.size} minified and brotlied`,
    `Source: ${REPO}/blob/main/src/${hook}.ts`,
    `Docs page: ${home}hooks/${hook}/`,
    previous && `Previous: [${previous}](${home}hooks/${previous}.md)`,
    next && `Next: [${next}](${home}hooks/${next}.md)`,
  ]
  return `${blocks.join('\n\n')}\n\n---\n\n${meta.filter(Boolean).join('\n')}\n`
}
