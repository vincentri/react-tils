// Runs each task through a headless Claude Code agent in a fresh project per condition.
// Usage: node eval/run.ts [reps=2] [concurrency=6] [models=sonnet] [variant=explicit]
//   models: comma-separated, e.g. haiku,sonnet. variant: explicit | realistic (see prompts.ts).
// Output: eval/out/<variant>/<model>.<condition>/<task>-<rep>.tsx (+ .json with cost/duration).
import { execFile } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promptsFor, type Variant } from './prompts.ts'

const [reps = 2, concurrency = 6] = process.argv.slice(2, 4).map(Number)
const models = (process.argv[4] ?? 'sonnet').split(',')
const variant = (process.argv[5] ?? 'explicit') as Variant
const prompts = promptsFor(variant)
const claude = process.env.CLAUDE_BIN ?? join(process.env.HOME!, '.local/bin/claude')
const pkg = new URL('..', import.meta.url).pathname
const out = new URL(`./out/${variant}/`, import.meta.url).pathname

type Condition = 'baseline' | 'library' | 'library+pointer'
const conditions: Condition[] = ['baseline', 'library', 'library+pointer']

function makeProject(condition: Condition): string {
  const dir = mkdtempSync(join(tmpdir(), 'hooks-eval-'))
  const deps: Record<string, string> = { react: '^19.0.0', 'react-dom': '^19.0.0' }
  if (condition !== 'baseline') deps['react-tils'] = '^0.0.0'
  if (variant === 'realistic') {
    deps.next = '^15.0.0'
    mkdirSync(join(dir, 'app'))
    writeFileSync(
      join(dir, 'app/layout.tsx'),
      'export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}\n',
    )
    writeFileSync(
      join(dir, 'app/page.tsx'),
      "import Solution from '../Solution'\n\nexport default function Page() {\n  return <Solution />\n}\n",
    )
  }
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'app', private: true, type: 'module', dependencies: deps }, null, 2),
  )
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { jsx: 'react-jsx', strict: true, moduleResolution: 'bundler' },
    }),
  )
  mkdirSync(join(dir, 'node_modules/@types'), { recursive: true })
  for (const dep of ['react', 'react-dom', '@types/react', '@types/react-dom'])
    symlinkSync(realpathSync(join(pkg, 'node_modules', dep)), join(dir, 'node_modules', dep))
  if (condition !== 'baseline') {
    // Install like npm would: only the published files.
    const files = [
      'package.json',
      ...JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).files,
      'README.md',
    ]
    for (const f of files)
      cpSync(join(pkg, f), join(dir, 'node_modules/react-tils', f), { recursive: true })
  }
  if (condition === 'library+pointer')
    writeFileSync(
      join(dir, 'CLAUDE.md'),
      'For React code that reads browser state, read node_modules/react-tils/AGENTS.md first.\n',
    )
  return dir
}

function runAgent(
  cwd: string,
  prompt: string,
  model: string,
): Promise<{ cost?: number; durationMs?: number; error?: string }> {
  const env = { ...process.env }
  for (const k of [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'OPENAI_BASE_URL',
  ])
    delete env[k]
  const args = [
    '-p',
    prompt,
    '--model',
    model,
    '--setting-sources',
    'project',
    '--strict-mcp-config',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    'Read,Write,Edit,Glob,Grep',
    '--disallowedTools',
    'Bash,WebFetch,WebSearch,Agent',
    '--output-format',
    'json',
  ]
  return new Promise((resolve) => {
    execFile(
      claude,
      args,
      { cwd, env, timeout: 300_000, maxBuffer: 10_000_000 },
      (error, stdout) => {
        try {
          const json = JSON.parse(stdout)
          resolve({
            cost: json.total_cost_usd,
            durationMs: json.duration_ms,
            error: json.is_error ? json.result : undefined,
          })
        } catch {
          resolve({ error: String(error ?? stdout).slice(0, 300) })
        }
      },
    )
  })
}

const jobs = models.flatMap((model) =>
  conditions.flatMap((condition) =>
    prompts.flatMap((task) =>
      Array.from({ length: reps }, (_, i) => ({ model, condition, task, rep: i + 1 })),
    ),
  ),
)

let done = 0
async function worker() {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    const { model, condition, task, rep } = job
    const dir = makeProject(condition)
    const meta = await runAgent(dir, task.prompt, model)
    const group = `${model}.${condition}`
    const target = join(out, group, `${task.id}-${rep}`)
    mkdirSync(join(out, group), { recursive: true })
    const solution = join(dir, 'Solution.tsx')
    writeFileSync(
      `${target}.tsx`,
      existsSync(solution)
        ? readFileSync(solution, 'utf8')
        : '// agent produced no Solution.tsx\nexport {}\n',
    )
    writeFileSync(`${target}.json`, JSON.stringify(meta, null, 2))
    rmSync(dir, { recursive: true, force: true })
    console.log(
      `[${++done}] ${model}.${condition} ${task.id}-${rep} ${meta.error ? `ERROR ${meta.error}` : `$${meta.cost?.toFixed(3)}`}`,
    )
  }
}

console.log(`${jobs.length} runs, ${variant} prompts, models ${models}, concurrency ${concurrency}`)
await Promise.all(Array.from({ length: concurrency }, worker))
