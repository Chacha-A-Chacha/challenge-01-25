// store/shared/offline-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OfflineAttendance, SyncStatus, BaseStoreState } from '@/types'

interface OfflineState extends BaseStoreState {
  // Connection state
  isOnline: boolean
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
  lastConnected: Date | null
  
  // Offline data
  pendingAttendance: OfflineAttendance[]
  failedSyncs: OfflineAttendance[]
  
  // Sync status
  syncStatus: SyncStatus
  autoSyncEnabled: boolean
  syncInterval: number // in milliseconds
  maxRetries: number
  
  // Actions
  setOnlineStatus: (online: boolean) => void
  setConnectionQuality: (quality: 'excellent' | 'good' | 'poor' | 'offline') => void
  addPendingAttendance: (attendance: Omit<OfflineAttendance, 'id' | 'retryCount'>) => void
  removePendingAttendance: (id: string) => void
  moveToFailedSync: (id: string) => void
  retryFailedSync: (id: string) => void
  syncPendingData: () => Promise<void>
  syncSingleAttendance: (attendance: OfflineAttendance) => Promise<boolean>
  clearPendingData: () => void
  clearFailedSyncs: () => void
  setAutoSync: (enabled: boolean) => void
  setSyncInterval: (interval: number) => void
  
  // Getters
  hasPendingData: () => boolean
  getTotalPending: () => number
  getOldestPending: () => OfflineAttendance | null
  canSync: () => boolean
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionQuality: 'excellent',
      lastConnected: new Date(),
      
      pendingAttendance: [],
      failedSyncs: [],
      
      syncStatus: {
        pending: 0,
        synced: 0,
        failed: 0
      },
      
      autoSyncEnabled: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      
      setOnlineStatus: (online) => {
        const now = new Date()
        set({ 
          isOnline: online,
          lastConnected: online ? now : get().lastConnected,
          connectionQuality: online ? 'excellent' : 'offline',
          lastUpdated: now
        })
        
        // Auto-sync when coming back online
        if (online && get().autoSyncEnabled && get().hasPendingData()) {
          setTimeout(() => get().syncPendingData(), 1000)
        }
      },
      
      setConnectionQuality: (quality) => set({ 
        connectionQuality: quality,
        lastUpdated: new Date()
      }),
      
      addPendingAttendance: (attendanceData) => {
        const id = `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const attendance: OfflineAttendance = {
          ...attendanceData,
          id,
          retryCount: 0
        }
        
        set((state) => ({
          pendingAttendance: [...state.pendingAttendance, attendance],
          syncStatus: {
            ...state.syncStatus,
            pending: state.syncStatus.pending + 1
          },
          lastUpdated: new Date()
        }))
        
        // Try to sync immediately if online
        if (get().isOnline && get().autoSyncEnabled) {
          setTimeout(() => get().syncSingleAttendance(attendance), 500)
        }
      },
      
      removePendingAttendance: (id) => set((state) => {
        const attendance = state.pendingAttendance.find(a => a.id === id)
        return {
          pendingAttendance: state.pendingAttendance.filter(a => a.id !== id),
          syncStatus: {
            ...state.syncStatus,
            pending: Math.max(0, state.syncStatus.pending - 1),
            synced: attendance ? state.syncStatus.synced + 1 : state.syncStatus.synced
          },
          lastUpdated: new Date()
        }
      }),
      
      moveToFailedSync: (id) => set((state) => {
        const attendance = state.pendingAttendance.find(a => a.id === id)
        if (!attendance) return state
        
        return {
          pendingAttendance: state.pendingAttendance.filter(a => a.id !== id),
          failedSyncs: [...state.failedSyncs, { ...attendance, retryCount: attendance.retryCount + 1 }],
          syncStatus: {
            ...state.syncStatus,
            pending: Math.max(0, state.syncStatus.pending - 1),
            failed: state.syncStatus.failed + 1
          },
          lastUpdated: new Date()
        }
      }),
      
      retryFailedSync: (id) => set((state) => {
        const failedSync = state.failedSyncs.find(a => a.id === id)
        if (!failedSync || failedSync.retryCount >= get().maxRetries) return state
        
        return {
          failedSyncs: state.failedSyncs.filter(a => a.id !== id),
          pendingAttendance: [...state.pendingAttendance, { ...failedSync, retryCount: 0 }],
          syncStatus: {
            ...state.syncStatus,
            pending: state.syncStatus.pending + 1,
            failed: Math.max(0, state.syncStatus.failed - 1)
          },
          lastUpdated: new Date()
        }
      }),
      
      syncSingleAttendance: async (attendance) => {
        if (!get().isOnline) return false
        
        try {
          const response = await fetch('/api/attendance/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qrData: attendance.qrData,
              sessionId: attendance.sessionId,
              offlineTimestamp: attendance.timestamp,
              studentUuid: attendance.studentUuid,
              isOfflineSync: true
            })
          })
          
          if (response.ok) {
            get().removePendingAttendance(attendance.id)
            return true
          } else {
            throw new Error(`Sync failed with status: ${response.status}`)
          }
        } catch (error) {
          console.error('Failed to sync attendance:', error)
          
          if (attendance.retryCount < get().maxRetries) {
            // Retry later
            setTimeout(() => get().syncSingleAttendance(attendance), 5000)
          } else {
            // Move to failed syncs
            get().moveToFailedSync(attendance.id)
          }
          return false
        }
      },
      
      syncPendingData: async () => {
        const { pendingAttendance, isOnline } = get()
        
        if (!isOnline || pendingAttendance.length === 0) return
        
        set({ isLoading: true, error: null })
        
        const syncPromises = pendingAttendance.map(attendance => 
          get().syncSingleAttendance(attendance)
        )
        
        try {
          await Promise.allSettled(syncPromises)
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Sync failed' })
        } finally {
          set({ isLoading: false, lastUpdated: new Date() })
        }
      },
      
      clearPendingData: () => set({ 
        pendingAttendance: [],
        syncStatus: { pending: 0, synced: 0, failed: get().syncStatus.failed },
        lastUpdated: new Date()
      }),
      
      clearFailedSyncs: () => set({ 
        failedSyncs: [],
        syncStatus: { ...get().syncStatus, failed: 0 },
        lastUpdated: new Date()
      }),
      
      setAutoSync: (enabled) => set({ 
        autoSyncEnabled: enabled,
        lastUpdated: new Date()
      }),
      
      setSyncInterval: (interval) => set({ 
        syncInterval: interval,
        lastUpdated: new Date()
      }),
      
      // Getters
      hasPendingData: () => get().pendingAttendance.length > 0 || get().failedSyncs.length > 0,
      
      getTotalPending: () => get().pendingAttendance.length + get().failedSyncs.length,
      
      getOldestPending: () => {
        const { pendingAttendance } = get()
        if (pendingAttendance.length === 0) return null
        
        return pendingAttendance.reduce((oldest, current) => 
          new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
        )
      },
      
      canSync: () => get().isOnline && get().connectionQuality !== 'offline'
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        pendingAttendance: state.pendingAttendance,
        failedSyncs: state.failedSyncs,
        syncStatus: state.syncStatus,
        autoSyncEnabled: state.autoSyncEnabled,
        syncInterval: state.syncInterval,
        maxRetries: state.maxRetries
      })
    }
  )
)

// Auto-sync setup - runs when store is initialized
if (typeof window !== 'undefined') {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true)
  })
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false)
  })
  
  // Setup periodic sync
  setInterval(() => {
    const state = useOfflineStore.getState()
    if (state.autoSyncEnabled && state.isOnline && state.hasPendingData()) {
      state.syncPendingData()
    }
  }, useOfflineStore.getState().syncInterval)
}

// Selectors for performance
export const useConnectionStatus = () => useOfflineStore(state => ({
  isOnline: state.isOnline,
  quality: state.connectionQuality,
  lastConnected: state.lastConnected
}))

export const usePendingData = () => useOfflineStore(state => ({
  pending: state.pendingAttendance,
  failed: state.failedSyncs,
  hasPending: state.hasPendingData(),
  totalPending: state.getTotalPending(),
  oldest: state.getOldestPending()
}))

export const useSyncControls = () => useOfflineStore(state => ({
  syncStatus: state.syncStatus,
  isLoading: state.isLoading,
  autoSyncEnabled: state.autoSyncEnabled,
  canSync: state.canSync(),
  syncPendingData: state.syncPendingData,
  setAutoSync: state.setAutoSync
}))
