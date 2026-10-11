// Measures react-tils against other hook libraries for the docs site's Compare page and writes
// demo/src/compare.json. Run with `pnpm compare` after changing a hook or updating a library in
// compare/package.json. Steps: build, server-render every case in plain Node, hydrate and check
// leaks in a browser-like environment, then measure every hook's size the same way.
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { LIBRARIES, type LibraryId, TASKS } from '../compare/tasks.ts'

const root = new URL('../', import.meta.url)
const run = (command: string, cwd = root) =>
  execSync(command, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })

run('pnpm build')
run('pnpm exec vitest run --config vitest.compare.config.ts compare/server.test.ts')
run('pnpm exec vitest run --config vitest.compare.config.ts compare/client.test.ts')
type Checked = { server: string; hydration: string; leaks: string; detail?: string }
const checked = JSON.parse(readFileSync(new URL('compare/results.json', root), 'utf8')) as Record<
  string,
  Partial<Record<LibraryId, Checked>>
>

// Sizes: one entry per hook, plus each library whole, minified and brotlied with React external.
const dir = new URL('compare/.size/', root)
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
const entries: { name: string; path: string; ignore: string[] }[] = []
const entry = (name: string, code: string) => {
  const file = `${entries.length}.js`
  writeFileSync(new URL(file, dir), code)
  entries.push({ name, path: `.size/${file}`, ignore: ['react', 'react-dom'] })
}
for (const { id, pkg } of LIBRARIES) entry(`${id}|*`, `export * from '${pkg}'\n`)
for (const task of TASKS)
  for (const { id, pkg } of LIBRARIES) {
    const hook = task.hooks[id]
    if (hook) entry(`${id}|${task.id}`, `export { ${hook} } from '${pkg}'\n`)
  }
writeFileSync(new URL('compare/.size-limit.json', root), JSON.stringify(entries))
const sizes = Object.fromEntries(
  (
    JSON.parse(run('pnpm exec size-limit --json', new URL('compare/', root))) as {
      name: string
      size: number
    }[]
  ).map((s) => [s.name, s.size]),
)

const version = (pkg: string, from: URL) =>
  (
    JSON.parse(readFileSync(new URL(`node_modules/${pkg}/package.json`, from), 'utf8')) as {
      version: string
    }
  ).version

const result = {
  measured: new Date().toISOString().slice(0, 10),
  libraries: LIBRARIES.map(({ id, pkg }) => ({
    id,
    pkg,
    version: version(pkg, new URL('compare/', root)),
    size: sizes[`${id}|*`],
  })),
  tasks: TASKS.map((task) => ({
    id: task.id,
    task: task.task,
    notes: task.notes ?? {},
    cells: Object.fromEntries(
      LIBRARIES.map(({ id }) => {
        const hook = task.hooks[id]
        const outcome = checked[task.id]?.[id]
        if (hook && !outcome) throw new Error(`no check result for ${id} ${task.id}`)
        return [id, hook ? { hook, size: sizes[`${id}|${task.id}`], ...outcome } : null]
      }),
    ),
  })),
}
const target = new URL('demo/src/compare.json', root)
const text = `${JSON.stringify(result, null, 2)}\n`
if (process.argv.includes('--check')) {
  // CI: the page's data must match what the current code measures (the date aside).
  const committed = JSON.parse(readFileSync(target, 'utf8')) as { measured: string }
  if (
    JSON.stringify({ ...committed, measured: '' }) !== JSON.stringify({ ...result, measured: '' })
  ) {
    console.error('demo/src/compare.json is out of date: run `pnpm compare` and commit it.')
    process.exit(1)
  }
} else writeFileSync(target, text)
console.log(`compare.json: ${TASKS.length} tasks, ${LIBRARIES.length} libraries`)
