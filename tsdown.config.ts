import { defineConfig } from 'tsdown'

// One output file per hook so `react-tils/useMediaQuery` imports exactly one hook.
export default defineConfig({
  entry: ['src/*.ts', '!src/*.test.ts'],
  format: 'esm',
  platform: 'neutral',
  unbundle: true,
  dts: true,
})
