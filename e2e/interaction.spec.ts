import { expect, test } from './fixtures'

test('useEventListener receives window events', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('x')
  await expect(page.getByTestId('last-key')).toHaveText('last key: x')
})

test('useClickOutside closes the menu on outside presses only', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('menu-toggle').click()
  await expect(page.getByTestId('menu')).toBeVisible()
  await page.getByTestId('menu').getByText('Profile').click()
  await expect(page.getByTestId('menu')).toBeVisible()
  await page.locator('header h1').click()
  await expect(page.getByTestId('menu')).toBeHidden()
})

test('useHotkey: mod+k opens, Escape closes, plain k does nothing', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hydrated')).toHaveText('true')
  await page.keyboard.press('k')
  await expect(page.getByTestId('palette')).toHaveText('palette closed')
  await page.keyboard.press('ControlOrMeta+k')
  await expect(page.getByTestId('palette')).toHaveText('palette open')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('palette')).toHaveText('palette closed')
})

test('useCopyToClipboard copies and shows Copied! briefly', async ({
  page,
  context,
  browserName,
}) => {
  // Only Chromium supports clipboard permissions in Playwright. Firefox and WebKit allow the
  // write from a click without one, but a test can't read the clipboard back there.
  const canRead = browserName === 'chromium'
  if (canRead) await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByTestId('copy').click()
  await expect(page.getByTestId('copy')).toHaveText('Copied!')
  if (canRead) {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('hello from hooks')
  }
  await expect(page.getByTestId('copy')).toHaveText('Copy', { timeout: 4000 })
})

test('useScrollLock stops page scrolling while the modal is open', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('modal-open').click()
  await expect(page.getByTestId('modal')).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
  // Clicking scrolled the button into view, so compare against where the page is now.
  const before = await page.evaluate(() => window.scrollY)
  await page.mouse.move(700, 300)
  await page.mouse.wheel(0, 800)
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.scrollY)).toBe(before)

  await page.getByTestId('modal-close').click()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  // WebKit drops a wheel event aimed at the just-removed Close button until the mouse moves.
  await page.mouse.move(700, 300)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('useBeforeUnload asks before reload only when there are unsaved changes', async ({ page }) => {
  await page.goto('/')
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type())
    await dialog.dismiss()
  })

  await page.getByTestId('dirty').check()
  await page.reload({ timeout: 2000 }).catch(() => {}) // dismissed: the reload is cancelled
  expect(dialogs).toEqual(['beforeunload'])

  await page.getByTestId('dirty').uncheck()
  await page.reload()
  expect(dialogs).toEqual(['beforeunload'])
})

test('useInterval ticks and pauses', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('ticks')).not.toHaveText('0 ticks')
  await page.getByTestId('ticks-toggle').click()
  const paused = await page.getByTestId('ticks').textContent()
  await page.waitForTimeout(1200)
  await expect(page.getByTestId('ticks')).toHaveText(paused!)
})

test('useScript loads a script once, on demand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('script-status')).toHaveText('idle')
  await page.getByTestId('script-load').click()
  await expect(page.getByTestId('script-status')).toHaveText('ready')
  expect(
    await page.evaluate(() => (window as { demoScriptLoaded?: boolean }).demoScriptLoaded),
  ).toBe(true)
  expect(await page.locator('script[src$="demo-script.js"]').count()).toBe(1)
})

test('useFullscreen enters and exits fullscreen', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByTestId('fullscreen-toggle')
  await toggle.click()
  await expect(page.getByTestId('fullscreen')).toHaveText('fullscreen')
  await toggle.click()
  await expect(page.getByTestId('fullscreen')).toHaveText('normal')
})

test('useWakeLock and useShare render a supported state without errors', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('wakelock')).toHaveText(/off|not supported/)
  await expect(page.getByTestId('share-supported')).toHaveText(/supported/)
})

test('useBroadcastChannel delivers to another tab, not the sender', async ({ page, context }) => {
  await page.goto('/')
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByTestId('hydrated')).toHaveText('true')
  await page.getByTestId('broadcast-send').click()
  await expect(other.getByTestId('broadcast-received')).toContainText('received: hi at')
  await expect(page.getByTestId('broadcast-received')).toHaveText('received: nothing yet')
  await other.close()
})

test('useFileDrop highlights while dragging files and receives the drop', async ({ page }) => {
  await page.goto('/')
  const zone = page.getByTestId('drop-zone')
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    return transfer
  })
  await zone.dispatchEvent('dragenter', { dataTransfer })
  await expect(page.getByTestId('drop-state')).toHaveText('release to drop')
  await zone.dispatchEvent('dragover', { dataTransfer })
  await zone.dispatchEvent('drop', { dataTransfer })
  await expect(page.getByTestId('drop-state')).toHaveText('notes.txt')
})

test('useLongPress fires on hold and swallows the click; short clicks still click', async ({
  page,
}) => {
  await page.goto('/')
  const hold = page.getByTestId('hold')
  await hold.click()
  await expect(page.getByTestId('hold-count')).toHaveText('held 0 · clicked 1')

  await hold.hover()
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  await expect(page.getByTestId('hold-count')).toHaveText('held 1 · clicked 1')
})

test('useUserMedia opens the camera and really releases it', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit in Playwright has no fake camera device')
  await page.goto('/')
  await page.getByTestId('camera-toggle').click()
  await expect(page.getByTestId('camera')).toHaveText('live')
  await page.getByTestId('camera-toggle').click()
  await expect(page.getByTestId('camera')).toHaveText('off')
  const states = await page.evaluate(() =>
    (window as unknown as { demoStream: MediaStream }).demoStream
      .getTracks()
      .map((t) => t.readyState),
  )
  expect(states.length).toBeGreaterThan(0)
  expect(states.every((state) => state === 'ended')).toBe(true)
})

test('useDebouncedCallback runs once after typing stops', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('search').pressSequentially('hooks', { delay: 30 })
  await expect(page.getByTestId('searched')).toHaveText('searched: hooks · calls 1')
})

test('useFocusTrap keeps Tab inside the drawer and restores focus on close', async ({ page }) => {
  await page.goto('/')
  // Open with the keyboard: restoring focus matters most for keyboard users, and Safari
  // doesn't focus buttons on click, so a mouse-opened drawer has no opener to return to.
  await page.getByTestId('drawer-open').focus()
  await page.keyboard.press('Enter')
  const drawer = page.getByTestId('drawer')
  await expect(drawer).toBeVisible()
  const focusInside = () =>
    page.evaluate(() => !!document.activeElement?.closest('[data-testid="drawer"]'))
  expect(await focusInside()).toBe(true)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await focusInside()).toBe(true)
  }
  await page.keyboard.press('Shift+Tab')
  expect(await focusInside()).toBe(true)

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page.getByTestId('drawer-open')).toBeFocused()
})

test('useSwipe detects a drag across the element', async ({ page }) => {
  await page.goto('/')
  // Mouse coordinates only hit elements inside the viewport.
  await page.getByTestId('swipe-area').scrollIntoViewIfNeeded()
  const box = (await page.getByTestId('swipe-area').boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width - 10, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 10, y, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByTestId('swipe')).toHaveText('last swipe: left')
})

test('useAnimationFrame runs while playing and stops when paused', async ({ page }) => {
  await page.goto('/')
  const frames = page.getByTestId('frames')
  await expect(frames).toHaveText('frames 0')
  await page.getByTestId('animation-toggle').click()
  await expect(frames).not.toHaveText('frames 0')
  await page.getByTestId('animation-toggle').click()
  const paused = await frames.textContent()
  await page.waitForTimeout(300)
  await expect(frames).toHaveText(paused!)
})

test('useMergedRefs sets every ref on one element', async ({ page }) => {
  await page.goto('/')
  const merged = page.getByTestId('merged')
  await merged.scrollIntoViewIfNeeded()
  await expect(merged).toHaveText(/^in view yes · width [1-9]\d* · useRef DIV$/)
})

test('useDebouncedValue catches up after typing stops', async ({ page }) => {
  await page.goto('/')
  const value = page.getByTestId('debounced-value')
  await page.getByTestId('debounced-input').pressSequentially('react', { delay: 30 })
  await expect(value).toHaveText('debounced: —') // still typing a moment ago
  await expect(value).toHaveText('debounced: react')
})

test('useStickToBottom follows a streamed reply, stops when scrolled up, and jumps back', async ({
  page,
}) => {
  await page.goto('/')
  const chat = page.getByTestId('chat')
  const following = page.getByTestId('chat-following')
  const distance = () => chat.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)
  await chat.scrollIntoViewIfNeeded()

  // Follows the reply as it grows, with no scroll event from the content itself.
  await page.getByTestId('chat-stream').click()
  await expect(page.getByTestId('chat-stream')).toBeEnabled()
  expect(await distance()).toBeLessThanOrEqual(1)
  await expect(following).toHaveText('following: yes')

  // Scroll up while the next reply streams: it must not pull the reader back down.
  await page.getByTestId('chat-stream').click()
  const box = (await chat.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -400)
  await expect(following).toHaveText('following: no')
  await expect(page.getByTestId('chat-stream')).toBeEnabled()
  expect(await distance()).toBeGreaterThan(1)

  await page.getByTestId('chat-jump').click()
  await expect(following).toHaveText('following: yes')
  await expect.poll(distance).toBeLessThanOrEqual(1)
})

test('useRovingFocus: one Tab stop, arrow keys move between toolbar buttons', async ({
  page,
  browserName,
}) => {
  await page.goto('/')
  const toolbar = page.getByTestId('toolbar')
  const button = (name: string) => toolbar.getByRole('button', { name })
  await expect(button('Bold')).toHaveAttribute('tabindex', '0')
  await expect(button('Italic')).toHaveAttribute('tabindex', '-1')

  await button('Bold').focus()
  await page.keyboard.press('ArrowRight')
  await expect(button('Italic')).toBeFocused()
  await page.keyboard.press('End')
  await expect(button('Strike')).toBeFocused()
  await page.keyboard.press('ArrowRight') // wraps
  await expect(button('Bold')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(button('Strike')).toHaveAttribute('tabindex', '0')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('toolbar-last')).toHaveText('pressed: Strike')

  // Safari's Tab skips buttons by default, so only check Tab order elsewhere.
  if (browserName === 'webkit') return
  await page.keyboard.press('Tab')
  expect(await toolbar.evaluate((el) => el.contains(document.activeElement))).toBe(false)
  await page.keyboard.press('Shift+Tab')
  await expect(button('Strike')).toBeFocused()
})

test('useTimeout: restart keeps "Saved" for 2s after the latest save', async ({ page }) => {
  await page.goto('/')
  const saved = page.getByTestId('saved')
  await page.getByTestId('save').click()
  await expect(saved).toHaveText('Saved ✓')
  await page.waitForTimeout(1500)
  await page.getByTestId('save').click()
  await page.waitForTimeout(1000) // 2.5s after the first save: hidden without restart
  await expect(saved).toHaveText('Saved ✓')
  await expect(saved).toHaveText('not saved')
})

test('useControllableState works uncontrolled and controlled', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('uncontrolled').click()
  await expect(page.getByTestId('uncontrolled')).toHaveText('uncontrolled: open')

  await page.getByTestId('controlled').click()
  await expect(page.getByTestId('controlled')).toHaveText('controlled: open')
  await expect(page.getByTestId('parent-open')).toHaveText('parent: open')
  await page.getByTestId('parent-close').click()
  await expect(page.getByTestId('controlled')).toHaveText('controlled: closed')
})

test('useTextSelection follows mouse and programmatic selection', async ({ page }) => {
  await page.goto('/')
  const selected = page.getByTestId('selected')
  await expect(selected).toHaveText('selected: —')
  await page.getByTestId('selectable-word').dblclick()
  await expect(selected).toHaveText(/^selected: anything\s?$/)

  await page.getByTestId('selectable').selectText()
  await expect(selected).toContainText('render the right first frame')

  await page.locator('header h1').click() // collapses the selection
  await expect(selected).toHaveText('selected: —')
})

test('useAutosizeTextarea grows with the text, stops at maxRows, and shrinks when cleared', async ({
  page,
}) => {
  await page.goto('/')
  const input = page.getByTestId('autosize')
  const height = async () => (await input.boundingBox())!.height
  const oneLine = await height()

  await input.click()
  await input.pressSequentially('one')
  for (const line of ['two', 'three']) {
    await page.keyboard.press('Enter')
    await input.pressSequentially(line)
  }
  const threeLines = await height()
  expect(threeLines).toBeGreaterThan(oneLine + 30) // two more 20px lines

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter')
    await input.pressSequentially(`more ${i}`)
  }
  const capped = await height()
  await page.keyboard.press('Enter')
  await input.pressSequentially('even more')
  expect(await height()).toBe(capped) // maxRows reached: it scrolls instead of growing
  expect(await input.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)

  await page.getByTestId('autosize-send').click() // clears the controlled value from code
  await expect.poll(height).toBe(oneLine)
})

test('usePasteFiles takes pasted images and leaves text pastes alone', async ({ page }) => {
  await page.goto('/')
  const input = page.getByTestId('paste-input')
  // A paste event as the browser fires it, with a screenshot or plain text on the clipboard.
  const paste = (kind: 'image' | 'text') =>
    input.evaluate((el, what) => {
      const data = new DataTransfer()
      if (what === 'image') data.items.add(new File(['png'], 'shot.png', { type: 'image/png' }))
      else data.setData('text/plain', 'hello')
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', { value: data })
      el.dispatchEvent(event)
      return event.defaultPrevented
    }, kind)

  expect(await paste('text')).toBe(false)
  await expect(page.getByTestId('pasted')).toHaveText('nothing pasted')
  expect(await paste('image')).toBe(true)
  await expect(page.getByTestId('pasted')).toHaveText('shot.png (image/png)')
})

test('useDrag resizes with a real drag, keeps going past the handle, and clamps', async ({
  page,
}) => {
  await page.goto('/')
  const splitter = page.getByTestId('splitter')
  await splitter.scrollIntoViewIfNeeded()
  const width = page.getByTestId('pane-width')
  await expect(width).toHaveText('left pane: 140px')

  const box = (await splitter.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 60, y + 40, { steps: 6 }) // well off the 8px handle
  await page.mouse.up()
  await expect(width).toHaveText('left pane: 200px')

  const box2 = (await splitter.boundingBox())!
  await page.mouse.move(box2.x + box2.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box2.x - 400, y, { steps: 6 })
  await page.mouse.up()
  await expect(width).toHaveText('left pane: 60px')
})

test('useAnnounce puts messages in hidden live regions', async ({ page }) => {
  await page.goto('/')
  const polite = page.locator('[aria-live="polite"]')
  const assertive = page.locator('[aria-live="assertive"]')
  await expect(polite).toHaveAttribute('role', 'status')
  await expect(polite).toHaveText('')

  await page.getByTestId('announce-add').click()
  await expect(polite).toHaveText('Added to cart. 1 items.')
  await page.getByTestId('announce-error').click()
  await expect(assertive).toHaveText('Payment failed.')
  // Visually hidden, but in the accessibility tree.
  expect((await polite.boundingBox())!.width).toBeLessThanOrEqual(1)
})

test('useCaretPosition follows the caret and places the mention popup there', async ({ page }) => {
  await page.goto('/')
  const field = page.getByTestId('caret-field')
  const caret = page.getByTestId('caret')
  await expect(caret).toHaveText('not focused')
  await field.click()
  const position = async () => {
    const [left, top] = (await caret.textContent())!
      .replace('caret at ', '')
      .split(', ')
      .map(Number)
    return { left: left!, top: top! }
  }
  await expect(caret).toHaveText(/^caret at /)
  const start = await position()

  await field.pressSequentially('Hello there')
  await expect.poll(async () => (await position()).left).toBeGreaterThan(start.left + 40)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await position()).top).toBeGreaterThan(start.top + 10)

  await field.pressSequentially('hi @a')
  const popup = page.getByTestId('mention-popup')
  await expect(popup).toHaveText('@alice')
  const at = await position()
  const popupBox = (await popup.boundingBox())!
  expect(Math.abs(popupBox.x - at.left)).toBeLessThanOrEqual(2)
  expect(popupBox.y).toBeGreaterThan(at.top)

  await page.keyboard.press('Space')
  await expect(popup).toHaveCount(0)
})
