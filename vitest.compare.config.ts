import { defineConfig } from 'vitest/config'

// The Compare page's checks, apart from the library's own suite. Run each file on its own and in
// order (scripts/compare.ts): server.test.ts, then client.test.ts.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
    include: ['compare/*.test.ts'],
  },
})
