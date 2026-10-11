import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
    exclude: ['eval/**', 'e2e/**', 'e2e-next/**', 'examples/**', 'demo/**', 'node_modules/**'],
  },
})
