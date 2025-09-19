// hooks/auth/useSessionManager.ts
import { useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from './useAuth'
import { useLogout } from './useLogout'
import { AUTH_CONFIG } from '@/lib/constants'

/**
 * Manage session lifecycle, expiry, and extension
 */
export function useSessionManager() {
  const { data: session, update } = useSession()
  const { isAuthenticated } = useAuth()
  const { logout } = useLogout()

  // Check if session is close to expiry
  const isSessionExpiringSoon = useCallback((): boolean => {
    if (!session?.expires) return false
    
    const expiryTime = new Date(session.expires).getTime()
    const currentTime = Date.now()
    const timeUntilExpiry = expiryTime - currentTime
    
    return timeUntilExpiry <= AUTH_CONFIG.SESSION_EXTEND_THRESHOLD
  }, [session])

  // Extend session
  const extendSession = useCallback(async (): Promise<boolean> => {
    try {
      await update()
      return true
    } catch (error) {
      console.error('Failed to extend session:', error)
      return false
    }
  }, [update])

  // Auto-extend session when user is active and session is expiring soon
  useEffect(() => {
    if (!isAuthenticated) return

    const checkAndExtendSession = async () => {
      if (isSessionExpiringSoon()) {
        const extended = await extendSession()
        if (!extended) {
          // If extension fails, logout user
          logout('/login')
        }
      }
    }

    // Check session every minute
    const interval = setInterval(checkAndExtendSession, 60000)
    
    return () => clearInterval(interval)
  }, [isAuthenticated, isSessionExpiringSoon, extendSession, logout])

  // Track user activity to extend session
  useEffect(() => {
    if (!isAuthenticated) return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    let lastActivity = Date.now()

    const handleActivity = () => {
      const now = Date.now()
      
      // Only extend if enough time has passed since last extension
      if (now - lastActivity > AUTH_CONFIG.SESSION_EXTEND_THRESHOLD) {
        lastActivity = now
        if (isSessionExpiringSoon()) {
          extendSession()
        }
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, isSessionExpiringSoon, extendSession])

  // Auto-logout on inactivity
  useEffect(() => {
    if (!isAuthenticated) return

    let inactivityTimer: NodeJS.Timeout

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        logout('/login')
      }, AUTH_CONFIG.INACTIVITY_TIMEOUT)
    }

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    // Set initial timer
    resetInactivityTimer()

    // Reset timer on activity
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true })
    })

    return () => {
      clearTimeout(inactivityTimer)
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [isAuthenticated, logout])

  return {
    // Session info
    session,
    isExpiringSoon: isSessionExpiringSoon(),
    
    // Actions
    extendSession,
    forceLogout: () => logout('/login')
  }
}
