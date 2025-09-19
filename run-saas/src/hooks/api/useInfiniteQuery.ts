// hooks/api/useInfiniteQuery.ts
import { useState, useCallback, useRef } from 'react'
import { useApiQuery } from './useApiQuery'
import type { PaginatedResponse } from '@/types'

interface UseInfiniteQueryOptions {
  enabled?: boolean
  limit?: number
  threshold?: number // When to trigger next page load (px from bottom)
}

/**
 * Infinite scrolling query hook
 */
export function useInfiniteQuery<T>(
  key: string | string[],
  urlBuilder: (page: number, limit: number) => string,
  options: UseInfiniteQueryOptions = {}
) {
  const {
    enabled = true,
    limit = 20,
    threshold = 1000
  } = options

  const [pages, setPages] = useState<T[][]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const queryKey = Array.isArray(key) ? key.join(':') : key
  const currentUrl = urlBuilder(currentPage, limit)

  const { data, isLoading, error, refetch } = useApiQuery<PaginatedResponse<T>>(
    `${queryKey}:page:${currentPage}`,
    currentUrl,
    {
      enabled: enabled && hasNextPage,
      onSuccess: (response) => {
        if (currentPage === 1) {
          // First page - reset everything
          setPages([response.data])
        } else {
          // Subsequent pages - append to existing data
          setPages(prev => [...prev, response.data])
        }
        
        setHasNextPage(response.hasMore)
        setIsFetchingNextPage(false)
      }
    }
  )

  const allData = pages.flat()

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return

    setIsFetchingNextPage(true)
    setCurrentPage(prev => prev + 1)
  }, [hasNextPage, isFetchingNextPage, isLoading])

  // Intersection observer for automatic loading
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading || isFetchingNextPage) return
    
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    
    if (node) {
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      }, {
        threshold: 0.1,
        rootMargin: `${threshold}px`
      })
      
      observerRef.current.observe(node)
    }
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, threshold])

  const reset = useCallback(() => {
    setPages([])
    setCurrentPage(1)
    setHasNextPage(true)
    setIsFetchingNextPage(false)
    refetch()
  }, [refetch])

  return {
    data: allData,
    isLoading: isLoading && currentPage === 1,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    reset,
    lastElementRef,
    
    // Metadata
    totalLoaded: allData.length,
    currentPage
  }
}
