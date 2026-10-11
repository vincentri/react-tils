// Proves every hook is compiled by React Compiler, not skipped: compiles each src/use*.ts with
// the same strict options as the test run and checks the hook's body uses the compiler's memo
// cache. A control snippet that breaks the Rules of React must fail, so a pass can't mean the
// strict setting was ignored.
import { readdirSync, readFileSync } from 'node:fs'
import { transformSync } from 'oxc-transform-react'
import { compilerOptions } from './react-compiler.ts'

const dir = new URL('../src/', import.meta.url)
const hooks = readdirSync(dir)
  .filter((f) => /^use\w+\.ts$/.test(f) && !f.endsWith('.test.ts'))
  .map((f) => f.slice(0, -3))

const problems: string[] = []
const nothingToMemoize: string[] = []
const compiled = (path: string, reactCompiler: typeof compilerOptions | false) =>
  transformSync(path, readFileSync(path, 'utf8'), {
    reactCompiler: reactCompiler && { ...reactCompiler, reportDiagnostics: true },
  })
const bodyOf = (code: string, name: string) => {
  const start = code.indexOf(`function ${name}(`)
  return start === -1 ? '' : code.slice(start, code.indexOf('\n}', start) + 2)
}

for (const hook of hooks) {
  const path = new URL(`${hook}.ts`, dir).pathname
  const result = compiled(path, compilerOptions)
  if (result.fatal || result.errors.length > 0) {
    problems.push(`${hook}: ${result.errors.map((e) => e.message).join('; ')}`)
    continue
  }
  const body = bodyOf(result.code, hook)
  // Compiled with memoization: the hook creates its memo cache, `const $ = _c(n)`.
  if (/= _c\(\d+\)/.test(body)) continue
  // Compiled with nothing to cache: the compiler still rewrote it (e.g. hoisted callbacks).
  const plain = bodyOf(compiled(path, false).code, hook)
  if (body !== plain) {
    nothingToMemoize.push(hook)
    continue
  }
  // A pass-through to an internal hook counts if that hook is compiled.
  const inner = /^function \w+\([^)]*\) \{\n\treturn (use\w+)\(/.exec(body)?.[1]
  const innerFile =
    inner &&
    readdirSync(new URL('internal/', dir)).find((f) =>
      readFileSync(new URL(`internal/${f}`, dir), 'utf8').includes(`export function ${inner}`),
    )
  if (inner && innerFile) {
    const innerResult = compiled(new URL(`internal/${innerFile}`, dir).pathname, compilerOptions)
    if (/= _c\(\d+\)/.test(bodyOf(innerResult.code, inner))) {
      nothingToMemoize.push(`${hook} (via ${inner})`)
      continue
    }
  }
  problems.push(`${hook}: not compiled`)
}

const control = transformSync(
  'control.tsx',
  'let count = 0\nexport function Bad() { count++; return <p>{count}</p> }',
  { reactCompiler: compilerOptions },
)
if (!control.fatal) problems.push('control: a Rules of React violation did not fail the build')

for (const problem of problems) console.error(problem)
const failed = problems.filter((p) => !p.startsWith('control')).length
console.log(
  `React Compiler (oxc): ${hooks.length - failed}/${hooks.length} hooks compiled ` +
    `(${nothingToMemoize.length} with nothing to cache: ${nothingToMemoize.join(', ')}), ` +
    `control ${control.fatal ? 'rejected as expected' : 'NOT rejected'}`,
)
if (problems.length > 0) process.exit(1)
