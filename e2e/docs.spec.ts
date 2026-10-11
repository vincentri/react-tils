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
  await page.locator('.crumb a').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'React hooks for browser state',
  )
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
    await expect(page.getByTestId('browser-support'), hook).toBeVisible()
  }
  // The fixture fails the test on any console error, including hydration mismatches.
})

test('theme: system, light, or dark; remembered and applied before the page hydrates', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const html = page.locator('html')
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const light = await background()
  await expect(html).not.toHaveAttribute('data-theme')

  const toggle = page.getByTestId('theme-toggle')
  await toggle.click() // system → light
  await expect(html).toHaveAttribute('data-theme', 'light')
  await toggle.click() // light → dark
  await expect(html).toHaveAttribute('data-theme', 'dark')
  expect(await background()).not.toBe(light)

  // An inline script in the HTML applies it before the bundle runs, so dark never flashes light.
  expect(await (await page.request.get('/')).text()).toContain('react-tils-theme')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(toggle).toHaveAttribute('aria-label', /Theme: dark/)

  await toggle.click() // dark → system
  await expect(html).not.toHaveAttribute('data-theme')
  expect(await background()).toBe(light)
})

test('search: / focuses it; finds hooks by name, purpose, or other names; keyboard to open', async ({
  page,
}) => {
  await page.goto('/hooks/useHash/')
  const search = page.getByTestId('site-search')
  const results = page.getByTestId('search-results')
  await page.keyboard.press('/')
  await expect(search).toBeFocused()

  await search.fill('query param')
  await expect(results.getByRole('option').first()).toContainText('useSearchParam')
  await search.fill('useQueryState') // nuqs's name for it
  await expect(results.getByRole('option').first()).toContainText('useSearchParam')
  await search.fill('install')
  await expect(results.getByRole('option').first()).toContainText('Install')
  await search.fill('zzzz')
  await expect(results).toContainText('No results')

  await search.fill('scroll')
  await expect(results.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  const second = (await results.getByRole('option').nth(1).locator('.search-title').textContent())!
  await search.press('ArrowDown')
  await expect(results.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true')
  await search.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(second)

  await page.getByTestId('site-search').fill('drag')
  await page.getByTestId('site-search').press('Escape')
  await expect(page.getByTestId('site-search')).toHaveValue('')
  await expect(page.getByTestId('search-results')).toBeHidden()
})

test('installation tutorial: from the sidebar, with package manager tabs and copy buttons', async ({
  page,
  browserName,
  context,
}) => {
  await page.goto('/')
  await page.getByTestId('link-getting-started').click()
  await expect(page).toHaveURL(/\/getting-started\/$/)
  await expect(page).toHaveTitle('Installation — react-tils')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Installation')
  for (const step of ['Install', 'Server rendering', 'Next.js', 'Set up your AI agent', 'Testing'])
    await expect(page.getByRole('heading', { level: 2, name: step, exact: true })).toBeVisible()

  const command = page.getByTestId('install-command')
  await expect(command).toHaveText('npm install @vincent.ri/react-tils')
  await page.getByTestId('pm-pnpm').click()
  await expect(command).toHaveText('pnpm add @vincent.ri/react-tils')
  await page.getByTestId('pm-bun').click()
  await expect(command).toHaveText('bun add @vincent.ri/react-tils')

  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const copy = page.locator('.code-block').first().getByRole('button', { name: 'Copy' })
    await copy.click()
    await expect(page.locator('.code-block').first().getByRole('button')).toHaveText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'bun add @vincent.ri/react-tils',
    )
  }
})

test('each hook page says which browsers support it, from MDN data', async ({ page }) => {
  await page.goto('/hooks/useSpeechRecognition/')
  await expect(page.getByTestId('support-badge')).toHaveText('! Not available in Firefox')
  const table = page.getByTestId('browser-support')
  // Prefixed support counts: the hook falls back to webkitSpeechRecognition.
  await expect(table.getByRole('cell', { name: 'Safari: 14.1 and later' })).toBeVisible()
  await expect(table.getByRole('cell', { name: 'Firefox: not supported' })).toBeVisible()
  await expect(table).toContainText('supported is false and start does nothing')

  await page.goto('/hooks/useMediaQuery/')
  await expect(page.getByTestId('support-badge')).toHaveText('✓ Works in all modern browsers')

  // An optional API doesn't count against the hook.
  await page.goto('/hooks/useHash/')
  await expect(page.getByTestId('support-badge')).toHaveText('✓ Works in all modern browsers')
  await expect(page.getByTestId('browser-support')).toContainText('Navigation APIoptional')

  await page.goto('/hooks/usePrevious/')
  await expect(page.getByTestId('browser-support')).toContainText('works wherever React does')
})
