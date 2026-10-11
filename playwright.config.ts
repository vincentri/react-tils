import { defineConfig, devices } from '@playwright/test'

// E2E tests run the prerendered demo (server HTML + hydration) in three real browsers,
// and a Next.js App Router example in Chromium. `pnpm e2e:serve` builds and serves both.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // A fake camera, and no permission prompt, for the useUserMedia test.
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          },
        },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Phones, emulated: touch input at phone size. Not a real device (see e2e-mobile).
    { name: 'mobile-chrome', testDir: 'e2e-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', testDir: 'e2e-mobile', use: { ...devices['iPhone 15'] } },
    {
      name: 'nextjs',
      testDir: 'e2e-next',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
  ],
  webServer: {
    command: 'pnpm e2e:serve',
    // Next starts last, so once it answers both servers are up.
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
