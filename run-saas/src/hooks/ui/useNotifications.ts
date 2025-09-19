// hooks/ui/useNotifications.ts
import { useUIStore } from '@/store'
import { useCallback } from 'react'
import type { NotificationType, NotificationAction } from '@/types'

/**
 * Toast notifications management
 */
export function useNotifications() {
  const { 
    notifications, 
    addNotification, 
    removeNotification, 
    clearNotifications,
    clearNotificationsByType 
  } = useUIStore()

  const show = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    duration?: number,
    actions?: NotificationAction[]
  ) => {
    return addNotification({
      type,
      title,
      message,
      duration,
      actions
    })
  }, [addNotification])

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    return show('success', title, message, duration)
  }, [show])

  const showError = useCallback((title: string, message: string, duration?: number) => {
    return show('error', title, message, duration)
  }, [show])

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    return show('warning', title, message, duration)
  }, [show])

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    return show('info', title, message, duration)
  }, [show])

  // Convenience methods for common patterns
  const showLoadingSuccess = useCallback((message: string = 'Operation completed successfully') => {
    return showSuccess('Success', message)
  }, [showSuccess])

  const showLoadingError = useCallback((message: string = 'An error occurred') => {
    return showError('Error', message)
  }, [showError])

  const showValidationError = useCallback((message: string = 'Please check your input') => {
    return showError('Validation Error', message)
  }, [showError])

  const showNetworkError = useCallback(() => {
    return showError('Network Error', 'Please check your internet connection and try again')
  }, [showError])

  const showPermissionError = useCallback(() => {
    return showError('Permission Denied', 'You do not have permission to perform this action')
  }, [showError])

  return {
    // State
    notifications,
    
    // Basic methods
    show,
    remove: removeNotification,
    clear: clearNotifications,
    clearByType: clearNotificationsByType,
    
    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Common patterns
    showLoadingSuccess,
    showLoadingError,
    showValidationError,
    showNetworkError,
    showPermissionError
  }
}
