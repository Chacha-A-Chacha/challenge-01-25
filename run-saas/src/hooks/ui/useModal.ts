// hooks/ui/useModal.ts
import { useUIStore } from '@/store'
import { useCallback } from 'react'
import type { Modal } from '@/types'

/**
 * Modal state management
 */
export function useModal() {
  const { 
    modals, 
    openModal, 
    closeModal, 
    closeAllModals, 
    isModalOpen 
  } = useUIStore()

  const open = useCallback((modal: Omit<Modal, 'id'>) => {
    return openModal(modal)
  }, [openModal])

  const close = useCallback((id: string) => {
    closeModal(id)
  }, [closeModal])

  const closeAll = useCallback(() => {
    closeAllModals()
  }, [closeAllModals])

  const isOpen = useCallback((component: string) => {
    return isModalOpen(component)
  }, [isModalOpen])

  // Convenience methods for common modals
  const openConfirmDialog = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    return open({
      component: 'ConfirmDialog',
      props: {
        title,
        message,
        onConfirm,
        onCancel,
        confirmText,
        cancelText
      },
      size: 'sm',
      closeOnBackdrop: false
    })
  }, [open])

  const openFormModal = useCallback((
    component: string,
    props: Record<string, any> = {},
    size: Modal['size'] = 'md'
  ) => {
    return open({
      component,
      props,
      size,
      closeOnBackdrop: false
    })
  }, [open])

  const openViewModal = useCallback((
    component: string,
    props: Record<string, any> = {},
    size: Modal['size'] = 'lg'
  ) => {
    return open({
      component,
      props,
      size,
      closeOnBackdrop: true
    })
  }, [open])

  return {
    // State
    modals,
    
    // Basic methods
    open,
    close,
    closeAll,
    isOpen,
    
    // Convenience methods
    openConfirmDialog,
    openFormModal,
    openViewModal
  }
}
