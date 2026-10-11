import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { reactCompiler } from '../scripts/react-compiler'

const src = new URL('../src/', import.meta.url).pathname

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  // GitHub Pages serves from /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  // REACT_COMPILER=1 compiles the demo and the library with React Compiler (pnpm e2e:compiler).
  plugins: [react(), ...(process.env.REACT_COMPILER === '1' ? [reactCompiler()] : [])],
  resolve: {
    // The demo imports the library the way users do: `react-tils`.
    alias: [{ find: /^react-tils$/, replacement: `${src}index.ts` }],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
