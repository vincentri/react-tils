import { defineConfig } from 'vitest/config'

const src = new URL('../src/', import.meta.url).pathname

export default defineConfig({
  resolve: {
    // Solutions import the package as an agent would: the root or `<package>/<entry>`.
    alias: [
      { find: /^@vincent\.ri\/react-tils$/, replacement: `${src}index.ts` },
      { find: /^@vincent\.ri\/react-tils\/(.+)$/, replacement: `${src}$1.ts` },
    ],
  },
  test: {
    root: new URL('.', import.meta.url).pathname,
    include: ['score.test.ts'],
    environment: 'happy-dom',
    testTimeout: 20_000,
  },
})
