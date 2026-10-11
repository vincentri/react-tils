import { expect, test } from '../e2e/fixtures'

test('server-rendered page hydrates without errors and hooks work', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 })
  await page.goto('/')
  await expect(page.getByTestId('hydrated')).toHaveText('true')
  await expect(page.getByTestId('wide')).toHaveText('wide')
  await expect(page.getByTestId('online')).toHaveText('online')

  await page.getByTestId('inc').click()
  await expect(page.getByTestId('count')).toHaveText('1')
  await page.reload()
  await expect(page.getByTestId('count')).toHaveText('1')
})

test('client-side navigation: react-tils never shows a wrong first frame; useEffect does', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 700 })
  await page.goto('/')
  await expect(page.getByTestId('hydrated')).toHaveText('true')

  // Record every value each width ever shows, including values replaced before
  // the next check: added text, and the old value of every text change.
  await page.evaluate(() => {
    const seen: Record<string, string[]> = { 'width-lib': [], 'width-effect': [] }
    Object.assign(window, { seen })
    new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target
        const owner = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
        const id = owner?.closest('[data-testid]')?.getAttribute('data-testid')
        if (record.type === 'characterData' && id && id in seen)
          seen[id]!.push(record.oldValue ?? '')
        for (const added of record.addedNodes) {
          const el = added instanceof Element ? added : added.parentElement
          for (const key of Object.keys(seen)) {
            const target = el?.matches?.(`[data-testid="${key}"]`)
              ? el
              : el?.querySelector?.(`[data-testid="${key}"]`)
            if (target) seen[key]!.push(target.textContent ?? '')
          }
        }
      }
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
    })
  })

  await page.getByTestId('to-measure').click()
  await expect(page.getByTestId('width-lib')).toHaveText('1024')
  await expect(page.getByTestId('width-effect')).toHaveText('1024')

  const seen = await page.evaluate(
    () => (window as unknown as { seen: Record<string, string[]> }).seen,
  )
  // The hand-written useEffect version showed 0 first: proves the recorder catches a flash.
  expect(seen['width-effect']).toContain('0')
  // react-tils showed the real width from its very first frame.
  expect(seen['width-lib']!.length).toBeGreaterThan(0)
  expect(seen['width-lib']!.every((value) => value === '1024')).toBe(true)
})

test('useHash follows a Next.js <Link> hash navigation (pushState, no hashchange)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('hydrated')).toHaveText('true')
  await expect(page.getByTestId('hash')).toHaveText('(none)')
  await page.getByTestId('hash-link').click()
  await expect(page).toHaveURL(/#billing$/)
  await expect(page.getByTestId('hash')).toHaveText('#billing')
  await page.goBack()
  await expect(page.getByTestId('hash')).toHaveText('(none)')
})
