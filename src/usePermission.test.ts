import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { usePermission } from './usePermission'

// Fake PermissionStatus: a real EventTarget with a writable state.
function fakePermissions(initial: PermissionState) {
  const status = Object.assign(new EventTarget(), { state: initial })
  const query = vi.fn<() => Promise<PermissionStatus>>(
    async () => status as unknown as PermissionStatus,
  )
  vi.spyOn(navigator, 'permissions', 'get').mockReturnValue({ query } as unknown as Permissions)
  return {
    query,
    status,
    change(state: PermissionState) {
      status.state = state
      status.dispatchEvent(new Event('change'))
    },
  }
}

// Module cache is per name, so each test uses its own name.
const Permission = ({ name }: { name: string }) => usePermission(name)

async function mount(name: string, count = 1) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () =>
    root.render(
      Array.from({ length: count }, (_, i) => createElement(Permission, { key: i, name })),
    ),
  )
  return { container, unmount: () => act(async () => root.unmount()) }
}

describe('usePermission', () => {
  hookMatrix(() => usePermission('geolocation'))

  it('starts unknown, resolves with one shared query, and follows changes', async () => {
    const permissions = fakePermissions('prompt')
    const { container, unmount } = await mount('notifications', 2)
    expect(container.textContent).toBe('promptprompt')
    expect(permissions.query).toHaveBeenCalledTimes(1)

    await act(async () => permissions.change('granted'))
    expect(container.textContent).toBe('grantedgranted')
    await unmount()
  })

  it('removes its change listener after the last unmount and reuses the answer', async () => {
    const permissions = fakePermissions('denied')
    const remove = vi.spyOn(permissions.status, 'removeEventListener')
    const first = await mount('camera')
    await first.unmount()
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function))

    const second = await mount('camera')
    expect(second.container.textContent).toBe('denied')
    expect(permissions.query).toHaveBeenCalledTimes(1)
    await second.unmount()
  })

  it('stays unknown when the browser cannot query the permission', async () => {
    vi.spyOn(navigator, 'permissions', 'get').mockReturnValue({
      query: async () => {
        throw new TypeError('not supported')
      },
    } as unknown as Permissions)
    const { container, unmount } = await mount('microphone')
    expect(container.textContent).toBe('unknown')
    await unmount()
  })

  it('is unknown when query throws synchronously instead of rejecting', async () => {
    const query = vi.fn<() => never>(() => {
      throw new TypeError('not a valid permission name')
    })
    vi.spyOn(navigator, 'permissions', 'get').mockReturnValue({ query } as unknown as Permissions)
    const view = await mount('sync-throw')
    expect(view.container.textContent).toBe('unknown')
    await view.unmount()
  })
})
