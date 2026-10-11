import type { CDPSession, Page } from '@playwright/test'
import { expect, test } from '../e2e/fixtures'

// Phone-sized browsers with touch: Android Chrome (Pixel 7) and WebKit at iPhone size. This is
// emulation, not a real device: Chromium gets real touch input through the DevTools protocol, so
// the browser's own touch handling and scrolling run; WebKit only gets synthetic pointer events.

type Point = { x: number; y: number }

/** A real touch gesture in Chromium: press, move in steps, optionally hold, lift. */
async function touch(cdp: CDPSession, from: Point, to: Point, holdMs = 0) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  if (holdMs) await new Promise((r) => setTimeout(r, holdMs))
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps
    const y = from.y + ((to.y - from.y) * i) / steps
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** Synthetic touch-type pointer events, for engines without real touch input here (WebKit). */
async function syntheticDrag(page: Page, testId: string, dx: number, dy: number) {
  await page.getByTestId(testId).evaluate(
    (el, [moveX, moveY]) => {
      const box = el.getBoundingClientRect()
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      const fire = (type: string, cx: number, cy: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            pointerType: 'touch',
            isPrimary: true,
            clientX: cx,
            clientY: cy,
            bubbles: true,
          }),
        )
      // Synthetic pointers can't be captured; the hooks handle that.
      el.setPointerCapture = () => {}
      el.hasPointerCapture = () => false
      fire('pointerdown', x, y)
      for (let i = 1; i <= 8; i++) fire('pointermove', x + (moveX! * i) / 8, y + (moveY! * i) / 8)
      fire('pointerup', x + moveX!, y + moveY!)
    },
    [dx, dy],
  )
}

const center = async (page: Page, testId: string): Promise<Point> => {
  const locator = page.getByTestId(testId)
  await locator.scrollIntoViewIfNeeded()
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('the demo fits a phone screen: nothing wider than the viewport', async ({ page }) => {
  // A hook page too: long signatures and code scroll inside their own box.
  for (const path of ['/hooks/useSearchParam/', '/']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
  // The sidebar becomes one row that scrolls sideways on its own.
  const nav = page.locator('.sidebar nav')
  expect(await nav.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
})

test('useSwipe: a swipe left is reported', async ({ page, browserName }) => {
  await page.goto('/')
  const status = page.getByTestId('swipe')
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const start = await center(page, 'swipe-area')
    await touch(cdp, start, { x: start.x - 140, y: start.y })
  } else {
    await page.getByTestId('swipe-area').scrollIntoViewIfNeeded()
    await syntheticDrag(page, 'swipe-area', -140, 0)
  }
  await expect(status).toHaveText('last swipe: left')
})

test('useLongPress: press and hold with a finger', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Holding needs real touch input (Chromium only here)')
  await page.goto('/')
  const cdp = await page.context().newCDPSession(page)
  const point = await center(page, 'hold')
  await touch(cdp, point, point, 700)
  // The tap that ends a long press must not also count as a click.
  await expect(page.getByTestId('hold-count')).toHaveText('held 1 · clicked 0')
})

test('useDrag: dragging the splitter with a finger resizes the pane', async ({
  page,
  browserName,
}) => {
  await page.goto('/')
  const width = page.getByTestId('pane-width')
  await expect(width).toHaveText('left pane: 140px')
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const start = await center(page, 'splitter')
    await touch(cdp, start, { x: start.x + 50, y: start.y })
  } else {
    await page.getByTestId('splitter').scrollIntoViewIfNeeded()
    await syntheticDrag(page, 'splitter', 50, 0)
  }
  await expect(width).toHaveText('left pane: 190px')
})

test("useScrollLock: a finger can't scroll the page behind the modal", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Touch scrolling needs real touch input (Chromium only here)',
  )
  await page.goto('/')
  const cdp = await page.context().newCDPSession(page)
  await page.getByTestId('modal-open').scrollIntoViewIfNeeded()
  await page.getByTestId('modal-open').tap()
  await expect(page.getByTestId('modal')).toBeVisible()
  const before = await page.evaluate(() => window.scrollY)
  await touch(cdp, { x: 200, y: 600 }, { x: 200, y: 150 })
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.scrollY)).toBe(before)

  await page.getByTestId('modal-close').tap()
  await touch(cdp, { x: 200, y: 600 }, { x: 200, y: 150 })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('useStickToBottom: a finger scrolling up stops following', async ({ page, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Touch scrolling needs real touch input (Chromium only here)',
  )
  await page.goto('/')
  const cdp = await page.context().newCDPSession(page)
  const following = page.getByTestId('chat-following')
  await page.getByTestId('chat-stream').scrollIntoViewIfNeeded()
  await page.getByTestId('chat-stream').tap()
  await expect(page.getByTestId('chat-stream')).toBeEnabled()
  await page.getByTestId('chat-stream').tap()
  const chat = await center(page, 'chat')
  await touch(cdp, { x: chat.x, y: chat.y - 40 }, { x: chat.x, y: chat.y + 60 })
  await expect(following).toHaveText('following: no')
})

test('usePointerPosition: follows a finger while it touches, then clears', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Needs real touch input (Chromium only here)')
  await page.goto('/')
  const cdp = await page.context().newCDPSession(page)
  const value = page.getByTestId('pointer')
  const start = await center(page, 'spotlight')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: start.x + 20, y: start.y + 10 }],
  })
  await expect(value).not.toHaveText('outside')
  const box = (await page.getByTestId('spotlight').boundingBox())!
  await expect(value).toHaveText(
    `x ${Math.round(start.x + 20 - box.x)} · y ${Math.round(start.y + 10 - box.y)}`,
  )
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(value).toHaveText('outside')
})
