// hooks/ui/useMediaQuery.ts
import { useState, useEffect } from 'react'
import { UI_CONFIG } from '@/lib/constants'

/**
 * Responsive design breakpoints
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

/**
 * Predefined breakpoint hooks
 */
export function useBreakpoints() {
  const isSm = useMediaQuery(`(min-width: ${UI_CONFIG.BREAKPOINTS.SM}px)`)
  const isMd = useMediaQuery(`(min-width: ${UI_CONFIG.BREAKPOINTS.MD}px)`)
  const isLg = useMediaQuery(`(min-width: ${UI_CONFIG.BREAKPOINTS.LG}px)`)
  const isXl = useMediaQuery(`(min-width: ${UI_CONFIG.BREAKPOINTS.XL}px)`)
  const is2Xl = useMediaQuery(`(min-width: ${UI_CONFIG.BREAKPOINTS['2XL']}px)`)

  const isMobile = !isMd
  const isTablet = isMd && !isLg
  const isDesktop = isLg

  return {
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isMobile,
    isTablet,
    isDesktop
  }
}
