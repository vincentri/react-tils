import { expect, test } from './fixtures'

test('each hook has its own page: from the sidebar, with docs and a working live demo', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByTestId('nav-useSearchParam').click()
  await expect(page).toHaveURL(/\/hooks\/useSearchParam\/$/)
  await expect(page).toHaveTitle('useSearchParam — react-tils')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('useSearchParam')
  await expect(page.getByTestId('nav-useSearchParam')).toHaveAttribute('aria-current', 'page')
  for (const section of ['Import', 'Usage', 'Live demo', 'When to use it', 'API'])
    await expect(page.getByRole('heading', { level: 2, name: section, exact: true })).toBeVisible()
  await expect(page.getByTestId('hook-signature')).toContainText(
    'function useSearchParam(name: string, serverValue?: string | null)',
  )
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /^One URL query parameter/,
  )

  // The live demo is the real one, hydrated.
  await page.getByTestId('query-input').fill('docs')
  await expect(page.getByTestId('query')).toHaveText('q: docs · sort: (none)')
  expect(new URL(page.url()).search).toBe('?q=docs')

  await page.getByRole('link', { name: 'useBroadcastChannel →' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('useBroadcastChannel')
  await page.getByRole('link', { name: 'All hooks' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('react-tils')
})

test('a card title on the home page opens the hook page', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('docs-useWindowFocus').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('useWindowFocus')
  // Its card is shared with useDocumentVisibility; the demo is still there.
  await expect(page.getByTestId('focus')).toBeVisible()
})

test('every hook page is prerendered and hydrates without errors', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'One engine is enough to walk all pages')
  test.setTimeout(120_000)
  await page.goto('/')
  const hooks = await page.locator('.sidebar a[data-testid^="nav-"]').allTextContents()
  expect(hooks.length).toBeGreaterThan(60)
  for (const hook of hooks) {
    const response = await page.goto(`/hooks/${hook}/`)
    // Prerendered: the HTML already has the page, before any script runs.
    expect(await response!.text(), hook).toContain(`<h1><code>${hook}</code></h1>`)
    await expect(page.getByTestId('hook-example'), hook).not.toBeEmpty()
    await expect(page.getByTestId('hook-signature'), hook).toContainText(`function ${hook}`)
  }
  // The fixture fails the test on any console error, including hydration mismatches.
})
