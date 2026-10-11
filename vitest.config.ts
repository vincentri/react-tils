import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
    exclude: [
      'eval/**',
      'e2e/**',
      'e2e-next/**',
      'e2e-mobile/**',
      'examples/**',
      'demo/**',
      'compare/**',
      'node_modules/**',
    ],
  },
})
