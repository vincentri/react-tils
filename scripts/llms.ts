// Generates llms.txt from the built type declarations, so it always matches the shipped JSDoc.
// Run after `pnpm build`. Output: demo/public/llms.txt (served at the demo site root).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
  name: string
  description: string
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
    sections.push(
      `## ${name}\n\n\`\`\`ts\nimport { ${name} } from '${entry}'\nfunction ${name}${signature!.trim()}\n\`\`\`\n\n${unJsdoc(doc!)}`,
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
