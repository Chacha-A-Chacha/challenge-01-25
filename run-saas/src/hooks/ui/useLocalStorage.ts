// hooks/ui/useLocalStorage.ts
import { useState, useCallback, useEffect } from 'react'
import { storage } from '@/lib/utils'

/**
 * Browser storage management with SSR safety
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue)

  // Initialize from localStorage on mount
  useEffect(() => {
    const value = storage.get(key, defaultValue)
    setStoredValue(value)
  }, [key, defaultValue])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      storage.set(key, valueToStore)
    } catch (error) {
      console.warn('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue)
      storage.remove(key)
    } catch (error) {
      console.warn('Error removing from localStorage:', error)
    }
  }, [key, defaultValue])

  return [storedValue, setValue, removeValue]
}
