// hooks/api/useOptimisticUpdate.ts
import { useState, useCallback } from 'react'

interface UseOptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  rollbackDelay?: number
}

/**
 * Optimistic updates for better UX
 */
export function useOptimisticUpdate<T>(
  options: UseOptimisticUpdateOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    rollbackDelay = 5000
  } = options

  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [isOptimistic, setIsOptimistic] = useState(false)

  const performOptimisticUpdate = useCallback(async <TResult>(
    optimisticValue: T,
    asyncOperation: () => Promise<TResult>,
    rollbackValue?: T
  ): Promise<TResult> => {
    // Apply optimistic update immediately
    setOptimisticData(optimisticValue)
    setIsOptimistic(true)

    try {
      const result = await asyncOperation()
      
      // Success - clear optimistic state
      setIsOptimistic(false)
      setOptimisticData(null)
      onSuccess?.(optimisticValue)
      
      return result
    } catch (error) {
      // Failure - rollback after delay
      setTimeout(() => {
        setOptimisticData(rollbackValue || null)
        setIsOptimistic(false)
      }, rollbackDelay)
      
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      onError?.(errorMessage)
      
      throw error
    }
  }, [onSuccess, onError, rollbackDelay])

  const clearOptimistic = useCallback(() => {
    setOptimisticData(null)
    setIsOptimistic(false)
  }, [])

  return {
    optimisticData,
    isOptimistic,
    performOptimisticUpdate,
    clearOptimistic
  }
}
