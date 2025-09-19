// hooks/ui/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  callback: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

/**
 * Keyboard navigation and shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const {
        key,
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        metaKey = false,
        callback,
        preventDefault = true
      } = shortcut

      const keyMatches = event.key.toLowerCase() === key.toLowerCase()
      const ctrlMatches = event.ctrlKey === ctrlKey
      const shiftMatches = event.shiftKey === shiftKey
      const altMatches = event.altKey === altKey
      const metaMatches = event.metaKey === metaKey

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(event)
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Common keyboard shortcuts for the application
 */
export function useCommonShortcuts({
  onSave,
  onCancel,
  onSearch,
  onNew,
  onRefresh
}: {
  onSave?: () => void
  onCancel?: () => void
  onSearch?: () => void
  onNew?: () => void
  onRefresh?: () => void
} = {}) {
  const shortcuts: KeyboardShortcut[] = []

  if (onSave) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      callback: onSave
    })
  }

  if (onCancel) {
    shortcuts.push({
      key: 'Escape',
      callback: onCancel
    })
  }

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      callback: onSearch
    })
  }

  if (onNew) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      callback: onNew
    })
  }

  if (onRefresh) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      callback: onRefresh
    })
  }

  useKeyboardShortcuts(shortcuts)
}
