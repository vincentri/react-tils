// React Compiler (oxc's Rust port, `oxc-transform-react`), set up to prove react-tils is
// compiler-safe: any function it can't compile fails the build, in every environment (client,
// server rendering, tests). scripts/compiler-report.ts checks that each hook was really compiled.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { type ReactCompilerOptions, transform } from 'oxc-transform-react'
import type { Plugin } from 'vite'

// React 18 has no built-in compiler runtime; it uses the react-compiler-runtime package.
function reactMajor(): string {
  const path = createRequire(import.meta.url).resolve('react/package.json')
  return (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version.split('.')[0]!
}

export const compilerOptions: ReactCompilerOptions = {
  panicThreshold: 'all_errors',
  target: reactMajor() === '18' ? '18' : '19',
}

// Test components write hook values to outer variables during render to inspect them, which the
// compiler rightly rejects. They stay uncompiled; the compiled demo covers app components.
const skip = /\.test\.tsx?$|\/src\/test\/|\/node_modules\//

export function reactCompiler(): Plugin {
  return {
    name: 'react-tils:react-compiler',
    enforce: 'pre',
    async transform(code, id) {
      const [file] = id.split('?')
      if (!file || !/\.[jt]sx?$/.test(file) || skip.test(file)) return
      const result = await transform(file, code, {
        jsx: { runtime: 'automatic', development: this.environment?.config.mode !== 'production' },
        reactCompiler: compilerOptions,
        sourcemap: true,
      })
      if (result.fatal) {
        const errors = result.errors.map((e) => `${e.message}\n${e.codeframe ?? ''}`)
        this.error(`React Compiler failed on ${file}:\n${errors.join('\n')}`)
      }
      return { code: result.code, map: result.map }
    },
  }
}
