// store/student/reassignment-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  ReassignmentRequest, 
  Session, 
  ReassignmentOption,
  ReassignmentFormData,
  RequestStatus,
  WeekDay,
  BaseStoreState,
  ApiResponse 
} from '@/types'

interface ReassignmentState extends BaseStoreState {
  // Reassignment data
  requests: ReassignmentRequest[]
  availableOptions: {
    saturday: ReassignmentOption[]
    sunday: ReassignmentOption[]
  }
  
  // Request limits
  maxRequests: number
  remainingRequests: number
  
  // Form state
  isSubmittingRequest: boolean
  submitError: string | null
  
  // Actions
  loadRequests: () => Promise<void>
  loadAvailableOptions: () => Promise<void>
  submitReassignmentRequest: (data: ReassignmentFormData) => Promise<boolean>
  cancelRequest: (requestId: string) => Promise<boolean>
  
  // Getters
  getPendingRequests: () => ReassignmentRequest[]
  getApprovedRequests: () => ReassignmentRequest[]
  getDeniedRequests: () => ReassignmentRequest[]
  canSubmitRequest: () => boolean
  getRequestsThisWeek: () => ReassignmentRequest[]
  getAvailableOptionsForDay: (day: WeekDay) => ReassignmentOption[]
  
  // Utility
  clearSubmitError: () => void
  refreshRemainingRequests: () => void
}

export const useReassignmentStore = create<ReassignmentState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      requests: [],
      availableOptions: {
        saturday: [],
        sunday: []
      },
      
      maxRequests: 3,
      remainingRequests: 3,
      
      isSubmittingRequest: false,
      submitError: null,
      
      // Load student's reassignment requests
      loadRequests: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/student/reassignment-requests')
          const data: ApiResponse<ReassignmentRequest[]> = await response.json()
          
          if (data.success && data.data) {
            set({ 
              requests: data.data,
              isLoading: false,
              lastUpdated: new Date()
            })
            
            // Update remaining requests count
            get().refreshRemainingRequests()
          } else {
            throw new Error(data.error || 'Failed to load reassignment requests')
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
        }
      },
      
      // Load available reassignment options
      loadAvailableOptions: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/student/reassignment-options')
          const data: ApiResponse<{ saturday: ReassignmentOption[]; sunday: ReassignmentOption[] }> = await response.json()
          
          if (data.success && data.data) {
            set({ 
              availableOptions: data.data,
              isLoading: false,
              lastUpdated: new Date()
            })
          } else {
            throw new Error(data.error || 'Failed to load available options')
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
        }
      },
      
      // Submit reassignment request
      submitReassignmentRequest: async (data) => {
        if (!get().canSubmitRequest()) {
          set({ submitError: 'Maximum number of requests reached' })
          return false
        }
        
        set({ isSubmittingRequest: true, submitError: null })
        
        try {
          const response = await fetch('/api/student/reassignment-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result: ApiResponse<ReassignmentRequest> = await response.json()
          
          if (result.success && result.data) {
            // Add new request to state
            set((state) => ({
              requests: [...state.requests, result.data!],
              isSubmittingRequest: false,
              lastUpdated: new Date()
            }))
            
            // Update remaining requests
            get().refreshRemainingRequests()
            
            return true
          } else {
            throw new Error(result.error || 'Failed to submit request')
          }
        } catch (error) {
          set({ 
            submitError: error instanceof Error ? error.message : 'Unknown error',
            isSubmittingRequest: false
          })
          return false
        }
      },
      
      // Cancel pending request
      cancelRequest: async (requestId) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/student/reassignment-requests/${requestId}/cancel`, {
            method: 'POST'
          })
          
          const result: ApiResponse = await response.json()
          
          if (result.success) {
            // Remove request from state
            set((state) => ({
              requests: state.requests.filter(req => req.id !== requestId),
              isLoading: false,
              lastUpdated: new Date()
            }))
            
            // Update remaining requests
            get().refreshRemainingRequests()
            
            return true
          } else {
            throw new Error(result.error || 'Failed to cancel request')
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
          return false
        }
      },
      
      // Getters
      getPendingRequests: () => 
        get().requests.filter(req => req.status === RequestStatus.PENDING),
      
      getApprovedRequests: () => 
        get().requests.filter(req => req.status === RequestStatus.APPROVED),
      
      getDeniedRequests: () => 
        get().requests.filter(req => req.status === RequestStatus.DENIED),
      
      canSubmitRequest: () => {
        const { remainingRequests } = get()
        const pendingRequests = get().getPendingRequests().length
        return remainingRequests > 0 && pendingRequests === 0 // Only one pending request at a time
      },
      
      getRequestsThisWeek: () => {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        return get().requests.filter(req => {
          const requestDate = new Date(req.requestedAt)
          return requestDate >= weekStart && requestDate < weekEnd
        })
      },
      
      getAvailableOptionsForDay: (day) => {
        const { availableOptions } = get()
        return day === WeekDay.SATURDAY ? availableOptions.saturday : availableOptions.sunday
      },
      
      // Utility functions
      clearSubmitError: () => set({ submitError: null }),
      
      refreshRemainingRequests: () => {
        const { maxRequests } = get()
        const totalRequests = get().requests.length
        const remaining = Math.max(0, maxRequests - totalRequests)
        
        set({ remainingRequests: remaining })
      }
    }),
    {
      name: 'reassignment-storage',
      partialize: (state) => ({
        maxRequests: state.maxRequests,
        remainingRequests: state.remainingRequests
      })
    }
  )
)

// Auto-refresh data periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useReassignmentStore.getState()
    // Refresh every 5 minutes to check for updates
    state.loadRequests()
    state.loadAvailableOptions()
  }, 5 * 60 * 1000) // 5 minutes
}

// Selectors for performance
export const useReassignmentRequests = () => useReassignmentStore(state => ({
  all: state.requests,
  pending: state.getPendingRequests(),
  approved: state.getApprovedRequests(),
  denied: state.getDeniedRequests(),
  thisWeek: state.getRequestsThisWeek()
}))

export const useReassignmentOptions = () => useReassignmentStore(state => ({
  saturday: state.availableOptions.saturday,
  sunday: state.availableOptions.sunday,
  loadOptions: state.loadAvailableOptions,
  getOptionsForDay: state.getAvailableOptionsForDay
}))

export const useReassignmentActions = () => useReassignmentStore(state => ({
  canSubmit: state.canSubmitRequest(),
  remainingRequests: state.remainingRequests,
  maxRequests: state.maxRequests,
  isSubmitting: state.isSubmittingRequest,
  submitError: state.submitError,
  submit: state.submitReassignmentRequest,
  cancel: state.cancelRequest,
  clearError: state.clearSubmitError
}))
