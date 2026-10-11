import type { NextConfig } from 'next'

// REACT_COMPILER=1 builds the app with Next's Rust React Compiler (pnpm e2e:compiler).
// react-tils itself comes from its published, uncompiled dist. Next 16.4's Rust compiler ignores
// panicThreshold and silently skips components it can't compile, so e2e:compiler checks the
// built chunk for compiled code instead of relying on a build failure.
const compile = process.env.REACT_COMPILER === '1'
const config: NextConfig = {
  reactCompiler: compile ? { panicThreshold: 'all_errors' } : false,
  experimental: { turbopackRustReactCompiler: compile },
}

export default config
