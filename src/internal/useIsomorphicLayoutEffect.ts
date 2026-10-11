import { useEffect, useLayoutEffect } from 'react'

// Layout effect in the browser (measure before paint), plain effect on the
// server, where React 18 warns about useLayoutEffect.
export const useIsomorphicLayoutEffect: typeof useEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
