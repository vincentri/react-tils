// Installs the packed package the way users do, into fresh projects outside this repo, and checks
// that it works: tarball contents, server render on React 18 and 19, the per-hook entry points,
// TypeScript types, `npx react-tils init`, and a Vite app compiled with React Compiler running in
// a real browser. Run with `pnpm test:install` (needs Playwright's Chromium).
import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const repo = new URL('..', import.meta.url).pathname
const versions = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')) as {
  devDependencies: Record<string, string>
}
const dev = (name: string) => versions.devDependencies[name]!
// Users get the compiler version @vitejs/plugin-react asks for, which can lag ours.
const pluginReact = JSON.parse(
  readFileSync(join(repo, 'node_modules/@vitejs/plugin-react/package.json'), 'utf8'),
) as { peerDependencies: Record<string, string> }
const root = mkdtempSync(join(tmpdir(), 'react-tils-install-'))
let failed = false

function run(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' })
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string }
    throw new Error(`\`${command}\` failed in ${cwd}\n${stdout ?? ''}${stderr ?? ''}`, {
      cause: error,
    })
  }
}

async function step(name: string, check: () => void | Promise<void>) {
  try {
    await check()
    console.log(`✓ ${name}`)
  } catch (error) {
    failed = true
    console.error(`✗ ${name}\n  ${(error as Error).message.split('\n').join('\n  ')}`)
  }
}

function project(name: string, files: Record<string, string>): string {
  const dir = join(root, name)
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(dir, file, '..'), { recursive: true })
    writeFileSync(join(dir, file), content)
  }
  return dir
}

const pkg = (deps: Record<string, string>, devDeps: Record<string, string> = {}) =>
  JSON.stringify({
    name: 'app',
    private: true,
    type: 'module',
    dependencies: deps,
    devDependencies: devDeps,
  })

// Renders hooks on the server through every kind of entry point, and checks internals are hidden.
const ssr = `import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { useLocalStorage, useMediaQuery, useNow, useOnline, useWindowSize } from '@vincent.ri/react-tils'
import { useHash } from '@vincent.ri/react-tils/useHash'

function App() {
  const wide = useMediaQuery('(min-width: 768px)', true)
  const online = useOnline()
  const [count] = useLocalStorage('count', 0)
  const now = useNow(1000)
  const { width } = useWindowSize()
  const [hash] = useHash('#top')
  return h('p', null, [wide, online, count, now, width, hash].join('|'))
}
assert.equal(renderToString(h(App)), '<p>true|true|0||0|#top</p>')
await assert.rejects(import('@vincent.ri/react-tils/internal/storage'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' })
console.log('ok')
`

await step('build and pack', () => {
  run('pnpm build', repo)
  run(`pnpm pack --pack-destination ${root}`, repo)
})
const tarball = join(
  root,
  readdirSync(root).find((f) => f.endsWith('.tgz'))!,
)

await step('tarball has dist, types, AGENTS.md, and the CLI; no source or tests', () => {
  const files = run(`tar -tzf ${tarball}`, root).split('\n').filter(Boolean)
  for (const needed of [
    'package/package.json',
    'package/AGENTS.md',
    'package/bin/react-tils.js',
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/dist/useMediaQuery.js',
    'package/dist/useMediaQuery.d.ts',
    'package/dist/testing.js',
  ])
    if (!files.includes(needed)) throw new Error(`missing ${needed}`)
  const unwanted = files.filter((f) => /\.test\.|\/src\/|\/demo\/|\/e2e/.test(f))
  if (unwanted.length > 0) throw new Error(`should not ship: ${unwanted.join(', ')}`)
})

const app19 = project('npm-react19', {
  'package.json': pkg(
    {
      react: dev('react'),
      'react-dom': dev('react-dom'),
      '@vincent.ri/react-tils': `file:${tarball}`,
    },
    { typescript: dev('typescript'), '@types/react': dev('@types/react') },
  ),
  'ssr.mjs': ssr,
  'src/app.ts': `import { useElementSize, useLocalStorage, useMediaQuery } from '@vincent.ri/react-tils'
import { useHotkey } from '@vincent.ri/react-tils/useHotkey'

export function useExample(): string {
  const wide: boolean = useMediaQuery('(min-width: 768px)')
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
  const [, { width }] = useElementSize<HTMLDivElement>()
  useHotkey('mod+k', () => setTheme('dark'))
  // @ts-expect-error: the query must be a string. Fails if the types were \`any\`.
  useMediaQuery(768)
  // @ts-expect-error: only 'light' or 'dark' can be stored.
  setTheme('blue')
  return \`\${wide} \${theme} \${width}\`
}
`,
  'tsconfig.bundler.json': JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      lib: ['es2022', 'dom'],
      skipLibCheck: false,
      types: [],
    },
    include: ['src'],
  }),
  'tsconfig.nodenext.json': JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'nodenext',
      moduleResolution: 'nodenext',
      lib: ['es2022', 'dom'],
      skipLibCheck: false,
      types: [],
    },
    include: ['src'],
  }),
})

await step('npm install, React 19: server render, per-hook import, internals hidden', () => {
  run('npm install --no-audit --no-fund --loglevel=error', app19)
  run('node ssr.mjs', app19)
})

await step(
  'TypeScript, moduleResolution bundler and nodenext: types resolve and reject wrong calls',
  () => {
    run('npx tsc -p tsconfig.bundler.json', app19)
    run('npx tsc -p tsconfig.nodenext.json', app19)
  },
)

await step('npx react-tils init adds the agent pointer, and the file it points to exists', () => {
  run('npx react-tils init', app19)
  for (const file of ['AGENTS.md', 'CLAUDE.md'])
    if (
      !readFileSync(join(app19, file), 'utf8').includes(
        'node_modules/@vincent.ri/react-tils/AGENTS.md',
      )
    )
      throw new Error(`${file} has no pointer line`)
  if (!existsSync(join(app19, 'node_modules/@vincent.ri/react-tils/AGENTS.md')))
    throw new Error('AGENTS.md not installed')
})

await step('pnpm install, React 18: server render with strict dependency isolation', () => {
  const app18 = project('pnpm-react18', {
    'package.json': pkg({
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      '@vincent.ri/react-tils': `file:${tarball}`,
    }),
    'ssr.mjs': ssr,
  })
  run('pnpm install --ignore-workspace --reporter=silent', app18)
  run('node ssr.mjs', app18)
})

for (const manager of ['yarn', 'bun'] as const) {
  if (!run(`command -v ${manager} || true`, root).trim()) continue
  await step(`${manager} install: server render`, () => {
    const dir = project(`${manager}-react19`, {
      'package.json': pkg({
        react: dev('react'),
        'react-dom': dev('react-dom'),
        '@vincent.ri/react-tils': `file:${tarball}`,
      }),
      'ssr.mjs': ssr,
    })
    run(manager === 'yarn' ? 'yarn install --silent' : 'bun install --silent', dir)
    run('node ssr.mjs', dir)
  })
}

await step(
  'Vite app compiled with React Compiler: production build runs in a browser',
  async () => {
    const app = project('vite-compiler', {
      'package.json': pkg(
        {
          react: dev('react'),
          'react-dom': dev('react-dom'),
          '@vincent.ri/react-tils': `file:${tarball}`,
        },
        {
          vite: dev('vite'),
          '@vitejs/plugin-react': dev('@vitejs/plugin-react'),
          'oxc-transform-react': pluginReact.peerDependencies['oxc-transform-react']!,
        },
      ),
      'vite.config.js': `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
const compiler = process.env.NO_COMPILER ? false : { panicThreshold: 'all_errors' }
export default defineConfig({ plugins: [react({ compiler })] })
`,
      'index.html':
        '<!doctype html><div id="root"></div><script type="module" src="/main.jsx"></script>',
      'main.jsx': `import { createRoot } from 'react-dom/client'
import { useHydrated, useInView, useLocalStorage, useOnline, useWindowSize } from '@vincent.ri/react-tils'

function App() {
  const { width } = useWindowSize()
  const online = useOnline()
  const [count, setCount] = useLocalStorage('count', 0)
  const [ref, inView] = useInView()
  const hydrated = useHydrated()
  return (
    <main>
      <p id="width">{width}</p>
      <p id="online">{String(online)}</p>
      <button id="count" onClick={() => setCount((c) => c + 1)}>{count}</button>
      <p id="inview" ref={ref}>{String(inView)}</p>
      <p id="hydrated">{String(hydrated)}</p>
    </main>
  )
}
createRoot(document.getElementById('root')).render(<App />)
`,
    })
    run('npm install --no-audit --no-fund --loglevel=error', app)
    // React's runtime always mentions useMemoCache; compiled code also pulls in the compiler
    // runtime, which calls it once more. Compare against a build without the compiler.
    const memoCacheCalls = () =>
      readdirSync(join(app, 'dist/assets'))
        .filter((f) => f.endsWith('.js'))
        .map(
          (f) => readFileSync(join(app, 'dist/assets', f), 'utf8').split('useMemoCache').length - 1,
        )
        .reduce((a, b) => a + b, 0)
    run('NO_COMPILER=1 npx vite build', app)
    const plain = memoCacheCalls()
    run('npx vite build', app)
    const compiled = memoCacheCalls()
    if (compiled <= plain)
      throw new Error(
        `the app was not compiled (useMemoCache: ${compiled}, without compiler ${plain})`,
      )

    const port = 4317
    const server = execSync(
      `npx vite preview --port ${port} --strictPort > preview.log 2>&1 & echo $!`,
      { cwd: app, encoding: 'utf8' },
    ).trim()
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
      const errors: string[] = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(e.message))
      for (let i = 0; i < 50; i++) {
        try {
          await page.goto(`http://localhost:${port}/`)
          break
        } catch {
          await new Promise((r) => setTimeout(r, 200))
        }
      }
      const text = (id: string) => page.locator(`#${id}`).textContent()
      const expect = async (id: string, value: string) => {
        await page
          .locator(`#${id}`)
          .filter({ hasText: value })
          .waitFor({ timeout: 5000 })
          .catch(async () => {
            throw new Error(`#${id} is "${await text(id)}", expected "${value}"`)
          })
      }
      await expect('width', '800')
      await expect('online', 'true')
      await expect('inview', 'true')
      await expect('hydrated', 'true')
      await page.click('#count')
      await expect('count', '1')
      await page.reload()
      await expect('count', '1')
      if (errors.length > 0) throw new Error(`console errors: ${errors.join('; ')}`)
    } finally {
      await browser.close()
      run(`kill ${server}`, app)
    }
  },
)

if (failed) {
  console.error(`\nKept for inspection: ${root}`)
  process.exit(1)
}
rmSync(root, { recursive: true, force: true })
console.log('\nInstall test passed.')
