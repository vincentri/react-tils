import { test as base, expect } from '@playwright/test'

// Every test fails if the page logs an error or throws, which includes hydration mismatches.
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await use(errors)
      expect(errors, 'console errors or uncaught exceptions').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
