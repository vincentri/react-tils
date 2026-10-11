import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { type NetworkInfo, useNetworkInformation } from './useNetworkInformation'

let state: NetworkInfo
const Network = () => {
  state = useNetworkInformation()
  return null
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'connection')
})

describe('useNetworkInformation', () => {
  hookMatrix(() => useNetworkInformation())

  it('is unknown where the browser does not support it', async () => {
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Network)))
    expect(state).toEqual({ saveData: false, effectiveType: 'unknown', downlink: null, rtt: null })
    await act(async () => root.unmount())
  })

  it('reads the connection and follows change events', async () => {
    const connection = Object.assign(new EventTarget(), {
      saveData: false,
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
    })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Network)))
    expect(state).toEqual({ saveData: false, effectiveType: '4g', downlink: 10, rtt: 50 })

    Object.assign(connection, { saveData: true, effectiveType: '2g', downlink: 0.2, rtt: 900 })
    await act(async () => connection.dispatchEvent(new Event('change')))
    expect(state).toEqual({ saveData: true, effectiveType: '2g', downlink: 0.2, rtt: 900 })
    await act(async () => root.unmount())
  })
})
