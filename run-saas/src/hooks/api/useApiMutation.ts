// hooks/api/useApiMutation.ts
import { useState, useCallback } from 'react'
import { fetchWithTimeout, parseApiResponse } from '@/lib/utils'
import { REQUEST_TIMEOUTS } from '@/lib/constants'
import { useUIStore } from '@/store'
import type { ApiResponse } from '@/types'

interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: string, variables: TVariables) => void
  onSettled?: (data: TData | null, error: string | null, variables: TVariables) => void
  showSuccessNotification?: boolean
  showErrorNotification?: boolean
  successMessage?: string
}

/**
 * Generic API mutation hook for create/update/delete operations
 */
export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseApiMutationOptions<TData, TVariables> = {}
) {
  const {
    onSuccess,
    onError,
    onSettled,
    showSuccessNotification = false,
    showErrorNotification = true,
    successMessage = 'Operation completed successfully'
  } = options

  const [data, setData] = useState<TData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { showSuccess, showError } = useUIStore()

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)

      if (result.success && result.data) {
        setData(result.data)
        onSuccess?.(result.data, variables)
        
        if (showSuccessNotification) {
          showSuccess('Success', result.message || successMessage)
        }
        
        return result.data
      } else {
        throw new Error(result.error || 'Mutation failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed'
      setError(errorMessage)
      onError?.(errorMessage, variables)
      
      if (showErrorNotification) {
        showError('Operation Failed', errorMessage)
      }
      
      throw err
    } finally {
      setIsLoading(false)
      onSettled?.(data, error, variables)
    }
  }, [mutationFn, onSuccess, onError, onSettled, showSuccessNotification, showErrorNotification, successMessage, showSuccess, showError, data, error])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    mutate,
    reset
  }
}

// hooks/api/usePagination.ts
import { useState, useCallback, useMemo } from 'react'
import { UI_CONFIG } from '@/lib/constants'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  totalItems?: number
}

/**
 * Pagination logic for tables and lists
 */
export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = UI_CONFIG.PAGINATION.DEFAULT_LIMIT,
    totalItems = 0
  } = options

  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const totalPages = useMemo(() => 
    Math.ceil(totalItems / limit), [totalItems, limit]
  )

  const hasNextPage = useMemo(() => 
    page < totalPages, [page, totalPages]
  )

  const hasPreviousPage = useMemo(() => 
    page > 1, [page]
  )

  const startIndex = useMemo(() => 
    (page - 1) * limit, [page, limit]
  )

  const endIndex = useMemo(() => 
    Math.min(startIndex + limit, totalItems), [startIndex, limit, totalItems]
  )

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const goToPage = useCallback((targetPage: number) => {
    const validPage = Math.max(1, Math.min(targetPage, totalPages))
    setPage(validPage)
  }, [totalPages])

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit)
    // Adjust current page to maintain roughly the same position
    const currentItem = (page - 1) * limit + 1
    const newPage = Math.ceil(currentItem / newLimit)
    setPage(newPage)
  }, [page, limit])

  const reset = useCallback(() => {
    setPage(initialPage)
    setLimit(initialLimit)
  }, [initialPage, initialLimit])

  // Generate page numbers for pagination UI
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const showPages = 5 // Show 5 page numbers
    const half = Math.floor(showPages / 2)
    
    let start = Math.max(1, page - half)
    let end = Math.min(totalPages, start + showPages - 1)
    
    // Adjust start if we're near the end
    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }, [page, totalPages])

  return {
    // State
    page,
    limit,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    
    // Computed
    hasNextPage,
    hasPreviousPage,
    pageNumbers,
    
    // Actions
    nextPage,
    previousPage,
    goToPage,
    changeLimit,
    reset,
    
    // For API calls
    offset: startIndex,
    queryParams: {
      page,
      limit,
      offset: startIndex
    }
  }
}

