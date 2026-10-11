import { expect, test } from './fixtures'

test.describe('server render and hydration', () => {
  test('server HTML has server values; hydration switches to real ones without errors', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/')).text()
    expect(html).toContain('data-testid="hydrated">false<')
    expect(html).toContain('data-testid="online">online<')

    await page.goto('/')
    await expect(page.getByTestId('hydrated')).toHaveText('true')
  })
})

test('useMediaQuery and useWindowSize follow real viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 })
  await page.goto('/')
  await expect(page.getByTestId('media-wide')).toHaveText('wide')
  await expect(page.getByTestId('window-size')).toHaveText('1024×700')

  await page.setViewportSize({ width: 500, height: 700 })
  await expect(page.getByTestId('media-wide')).toHaveText('narrow')
  await expect(page.getByTestId('window-size')).toHaveText('500×700')
})

test('useMediaQuery follows the OS color scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByTestId('media-dark')).toHaveText('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.getByTestId('media-dark')).toHaveText('light')
})

test('useWindowScroll and useInView follow real scrolling', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('inview')).toHaveText('no')
  // Over the content, not the sidebar, which scrolls on its own.
  await page.mouse.move(700, 400)
  await page.mouse.wheel(0, 600)
  await expect(page.getByTestId('window-scroll')).not.toHaveText('y = 0')
  await page.getByTestId('inview-target').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('inview')).toHaveText('yes')
})

test('useElementSize follows a real ResizeObserver', async ({ page }) => {
  await page.goto('/')
  // Content box: the 160px/240px box minus 10px padding and 1px border on each side.
  const width = page.getByTestId('element-width')
  const border = page.getByTestId('element-border-width')
  await expect(width).toHaveText('138px')
  await expect(border).toHaveText('border box 160px')
  await page.getByTestId('element-toggle').click()
  await expect(width).toHaveText('218px')
  await expect(border).toHaveText('border box 240px')
})

test('useOnline follows the network', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByTestId('online')).toHaveText('online')
  await context.setOffline(true)
  await expect(page.getByTestId('online')).toHaveText('offline')
  await context.setOffline(false)
  await expect(page.getByTestId('online')).toHaveText('online')
})

test('useLocalStorage persists across reloads and syncs across tabs', async ({ page, context }) => {
  await page.goto('/')
  await page.getByTestId('local-inc').click()
  await page.getByTestId('local-inc').click()
  await expect(page.getByTestId('local-count')).toHaveText('local 2')

  await page.reload()
  await expect(page.getByTestId('local-count')).toHaveText('local 2')

  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByTestId('local-count')).toHaveText('local 2')
  await other.getByTestId('local-inc').click()
  await expect(page.getByTestId('local-count')).toHaveText('local 3')
  await other.close()
})

test('useSessionStorage persists across reloads but not into a new tab', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByTestId('session-inc').click()
  await page.reload()
  await expect(page.getByTestId('session-count')).toHaveText('session 1')

  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByTestId('session-count')).toHaveText('session 0')
  await other.close()
})

test.describe('with German as the browser language', () => {
  test.use({ locale: 'de-DE' })
  test('usePreferredLanguages reads the browser languages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('languages')).toContainText('de-DE')
  })
})

test.describe('with a fake location', () => {
  test.use({ geolocation: { latitude: 52.52, longitude: 13.4 }, permissions: ['geolocation'] })
  test('usePermission and useGeolocation: no request until asked, then a position', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('geo-permission')).toHaveText('permission: granted')
    await page.getByTestId('geo-ask').click()
    await expect(page.getByTestId('geo-position')).toHaveText('52.52, 13.40')
  })
})

test('usePermission reports prompt when nothing is granted', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('geo-permission')).toHaveText('permission: prompt')
})

test('useIdle goes idle after 3s without input and back on input', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('idle')).toHaveText('active')
  await expect(page.getByTestId('idle')).toHaveText('idle', { timeout: 6000 })
  await page.mouse.move(10, 10)
  await page.mouse.move(40, 40)
  await expect(page.getByTestId('idle')).toHaveText('active')
})

test('useScrollDirection follows real scrolling', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('scroll-direction')).toHaveText('up')
  await page.mouse.move(700, 400)
  await page.mouse.wheel(0, 800)
  await expect(page.getByTestId('scroll-direction')).toHaveText('down')
  await page.mouse.wheel(0, -300)
  await expect(page.getByTestId('scroll-direction')).toHaveText('up')
})

test('useVisualViewport follows the real viewport', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto('/')
  await expect(page.getByTestId('visual-viewport')).toHaveText('800×600 · bottomInset 0')
  await page.setViewportSize({ width: 640, height: 500 })
  await expect(page.getByTestId('visual-viewport')).toHaveText('640×500 · bottomInset 0')
})

test('useNetworkInformation reports Chromium connection info, unknown elsewhere', async ({
  page,
  browserName,
}) => {
  await page.goto('/')
  const network = page.getByTestId('network')
  if (browserName === 'chromium') await expect(network).toHaveText(/^(slow-2g|2g|3g|4g) · /)
  else await expect(network).toHaveText('unknown · data saver off')
})

test('useNow: placeholder in the server HTML, then a ticking clock', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('data-testid="now">--:--:--<')
  await page.goto('/')
  const now = page.getByTestId('now')
  await expect(now).toHaveText(/^\d\d:\d\d:\d\d$/)
  const first = await now.textContent()
  await expect(now).not.toHaveText(first!)
})

test('useHash reads the hash on load, follows links, setHash, and Back', async ({ page }) => {
  await page.goto('/#billing')
  await expect(page.getByTestId('hash')).toHaveText('tab: billing · hash #billing')
  await page.getByTestId('tab-profile').click()
  await expect(page.getByTestId('hash')).toHaveText('tab: profile · hash #profile-tab')
  await page.getByTestId('tab-billing').click()
  await expect(page.getByTestId('hash')).toHaveText('tab: billing · hash #billing')
  await page.goBack()
  await expect(page.getByTestId('hash')).toHaveText('tab: profile · hash #profile-tab')
  await page.reload()
  await expect(page.getByTestId('hash')).toHaveText('tab: profile · hash #profile-tab')
})

test('useElementScroll follows a scroll container and its edges', async ({ page }) => {
  await page.goto('/')
  const panel = page.getByTestId('scroll-panel')
  const value = page.getByTestId('element-scroll')
  await expect(value).toHaveText('y 0 · top yes · bottom no')
  await expect(panel).toHaveClass(/shadow-bottom/)
  await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await expect(value).toHaveText(/top no · bottom yes$/)
  await expect(panel).toHaveClass(/shadow-top/)
  await expect(panel).not.toHaveClass(/shadow-bottom/)
})

test('useScrollSpy: the sidebar marks the section being read', async ({ page }) => {
  await page.goto('/')
  const spy = page.getByTestId('spy-active')
  await expect(spy).toHaveText('reading: —') // top of the page: no section past the line yet

  await page.getByTestId('nav-useHash').click()
  await expect(spy).toHaveText('reading: useHash')
  await expect(page.getByTestId('nav-useHash')).toHaveAttribute('aria-current', 'location')
  await expect(page.getByTestId('nav-useMediaQuery')).not.toHaveAttribute('aria-current')

  // At the very bottom, the last section is active even though it's too short to reach the line.
  await page.getByTestId('inview-target').scrollIntoViewIfNeeded()
  await expect(spy).toHaveText('reading: useControllableState')
})

test('useIsStuck: the status bar reports when it sticks', async ({ page }) => {
  await page.goto('/')
  const stuck = page.getByTestId('stuck')
  await expect(stuck).toHaveText('status bar stuck: no')
  await page.mouse.move(700, 400)
  await page.mouse.wheel(0, 800)
  await expect(stuck).toHaveText('status bar stuck: yes')
  await expect(page.locator('.sticky-status')).toHaveClass(/stuck/)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(stuck).toHaveText('status bar stuck: no')
})
