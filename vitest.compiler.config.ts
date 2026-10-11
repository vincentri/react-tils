import { defineConfig, mergeConfig } from 'vitest/config'
import { reactCompiler } from './scripts/react-compiler'
import base from './vitest.config'

// The whole unit suite again, with the library compiled by React Compiler (scripts/react-compiler.ts).
export default mergeConfig(base, defineConfig({ plugins: [reactCompiler()] }))
