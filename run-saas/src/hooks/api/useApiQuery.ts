// hooks/api/useApiQuery.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchWithTimeout, parseApiResponse } from '@/lib/utils'
import { REQUEST_TIMEOUTS } from '@/lib/constants'
import { useUIStore } from '@/store'
import type { ApiResponse } from '@/types'

interface UseApiQueryOptions {
  enabled?: boolean
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  staleTime?: number
  cacheTime?: number
  retry?: number
  retryDelay?: number
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

/**
 * Generic API query hook with caching and error handling
 */
export function useApiQuery<T>(
  key: string | string[],
  url: string,
  options: UseApiQueryOptions = {}
) {
  const {
    enabled = true,
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const { showError } = useUIStore()
  const retryCountRef = useRef(0)
  const queryKey = Array.isArray(key) ? key.join(':') : key

  // Simple in-memory cache
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())

  const isStale = useCallback(() => {
    if (!lastFetch) return true
    return Date.now() - lastFetch.getTime() > staleTime
  }, [lastFetch, staleTime])

  const getCachedData = useCallback(() => {
    const cached = cacheRef.current.get(queryKey)
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > cacheTime
    if (isExpired) {
      cacheRef.current.delete(queryKey)
      return null
    }
    
    return cached.data
  }, [queryKey, cacheTime])

  const setCachedData = useCallback((data: T) => {
    cacheRef.current.set(queryKey, {
      data,
      timestamp: Date.now()
    })
  }, [queryKey])

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return

    // Use cached data if available and not stale
    if (!force && !isStale()) {
      const cached = getCachedData()
      if (cached) {
        setData(cached)
        return cached
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      }, REQUEST_TIMEOUTS.DEFAULT)

      const result: ApiResponse<T> = await parseApiResponse(response)

      if (result.success && result.data) {
        setData(result.data)
        setCachedData(result.data)
        setLastFetch(new Date())
        retryCountRef.current = 0
        onSuccess?.(result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      
      // Retry logic
      if (retryCountRef.current < retry) {
        retryCountRef.current++
        setTimeout(() => {
          fetchData(force)
        }, retryDelay * Math.pow(2, retryCountRef.current - 1)) // Exponential backoff
        return
      }

      setError(errorMessage)
      onError?.(errorMessage)
      
      // Show user-friendly error notification
      if (retryCountRef.current >= retry) {
        showError('Data Loading Failed', errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }, [url, enabled, isStale, getCachedData, setCachedData, retry, retryDelay, onSuccess, onError, showError])

  // Initial fetch
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData()
    }
  }, [enabled, refetchOnMount, fetchData])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (isStale()) {
        fetchData(true)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, isStale, fetchData])

  const refetch = useCallback(() => fetchData(true), [fetchData])
  const invalidate = useCallback(() => {
    cacheRef.current.delete(queryKey)
    setLastFetch(null)
  }, [queryKey])

  return {
    data,
    isLoading,
    error,
    lastFetch,
    refetch,
    invalidate,
    isStale: isStale()
  }
}
