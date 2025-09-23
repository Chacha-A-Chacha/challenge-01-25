// store/shared/offline-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  OfflineAttendance,
  SyncStatus,
  BaseStoreState,
  AttendanceStatus,
  QRCodeData,
  ApiResponse,
  ConnectionQuality,
  SyncResult,
  OfflineQueueItem,
  NetworkInfo,
  SyncStrategy
} from '@/types'
import { 
  ATTENDANCE_STATUS,
  WEEK_DAYS,
  ERROR_MESSAGES,
  API_ROUTES,
  BUSINESS_RULES,
  QR_CONFIG,
  OFFLINE_CONFIG
} from '@/lib/constants'
import { 
  validateForm,
  qrCodeDataSchema,
  offlineAttendanceSchema
} from '@/lib/validations'
import { 
  formatDate,
  getStartEndOfDay,
  parseTimeToMinutes,
  createApiResponse,
  sanitizeInput,
  generateUniqueId,
  isNetworkError,
  delay
} from '@/lib/utils'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OfflineState extends BaseStoreState {
  // Connection state
  isOnline: boolean
  connectionQuality: ConnectionQuality
  networkInfo: NetworkInfo
  lastConnected: Date | null
  connectionHistory: Array<{
    timestamp: Date
    isOnline: boolean
    quality: ConnectionQuality
  }>
  
  // Offline data management
  pendingAttendance: OfflineAttendance[]
  failedSyncs: OfflineAttendance[]
  syncQueue: OfflineQueueItem[]
  
  // Sync configuration
  syncStatus: SyncStatus
  syncStrategy: SyncStrategy
  autoSyncEnabled: boolean
  syncInterval: number
  maxRetries: number
  batchSize: number
  
  // Sync state
  isSyncing: boolean
  syncProgress: {
    total: number
    completed: number
    failed: number
    currentItem?: string
  }
  lastSyncAttempt: Date | null
  nextSyncScheduled: Date | null
  
  // Performance monitoring
  syncMetrics: {
    successRate: number
    averageSyncTime: number
    totalSynced: number
    totalFailed: number
    lastMetricsReset: Date
  }
  
  // Actions - Connection Management
  setOnlineStatus: (online: boolean, quality?: ConnectionQuality) => void
  updateConnectionQuality: (quality: ConnectionQuality) => void
  updateNetworkInfo: (info: Partial<NetworkInfo>) => void
  testConnection: () => Promise<ConnectionQuality>
  
  // Actions - Offline Data Management
  addPendingAttendance: (data: Omit<OfflineAttendance, 'id' | 'retryCount' | 'lastAttempt'>) => string
  removePendingAttendance: (id: string) => void
  updatePendingAttendance: (id: string, updates: Partial<OfflineAttendance>) => void
  moveToFailedSync: (id: string, error: string) => void
  retryFailedSync: (id: string) => Promise<boolean>
  clearPendingData: () => void
  clearFailedSyncs: () => void
  
  // Actions - Sync Management
  syncPendingData: () => Promise<SyncResult>
  syncSingleAttendance: (attendance: OfflineAttendance) => Promise<boolean>
  scheduleBatchSync: () => void
  cancelScheduledSync: () => void
  forceSyncAll: () => Promise<SyncResult>
  
  // Actions - Configuration
  setAutoSync: (enabled: boolean) => void
  setSyncInterval: (interval: number) => void
  setSyncStrategy: (strategy: SyncStrategy) => void
  setBatchSize: (size: number) => void
  setMaxRetries: (retries: number) => void
  
  // Getters - Data State
  hasPendingData: () => boolean
  getTotalPending: () => number
  getOldestPending: () => OfflineAttendance | null
  getPendingBySession: (sessionId: string) => OfflineAttendance[]
  getPendingByDate: (date: Date) => OfflineAttendance[]
  getFailedSyncs: () => OfflineAttendance[]
  
  // Getters - Sync State
  canSync: () => boolean
  getSyncProgress: () => number
  getEstimatedSyncTime: () => number
  getNextSyncTime: () => Date | null
  getSyncMetrics: () => typeof OfflineState.prototype.syncMetrics
  
  // Getters - Business Logic
  validateOfflineAttendance: (data: unknown) => { isValid: boolean; data?: OfflineAttendance; errors?: string[] }
  isAttendanceExpired: (attendance: OfflineAttendance) => boolean
  shouldRetrySync: (attendance: OfflineAttendance) => boolean
  getConnectionStatus: () => 'excellent' | 'good' | 'poor' | 'offline'
  
  // Utility Actions
  exportOfflineData: () => Record<string, unknown>[]
  importOfflineData: (data: Record<string, unknown>[]) => Promise<{ imported: number; errors: string[] }>
  clearAllData: () => void
  resetMetrics: () => void
  optimizeQueue: () => void
  diagnosticInfo: () => Record<string, unknown>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate QR code data for offline storage
 */
function validateQRData(qrCodeString: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(qrCodeString)
    const validation = validateForm(qrCodeDataSchema, parsed)
    
    if (validation.isValid && validation.data) {
      return validation.data
    }
    
    return null
  } catch (error) {
    console.warn('Invalid QR code format:', error)
    return null
  }
}

/**
 * Calculate connection quality based on network metrics
 */
function calculateConnectionQuality(networkInfo: NetworkInfo): ConnectionQuality {
  if (!networkInfo.isOnline) return 'offline'
  
  const { effectiveType, downlink, rtt } = networkInfo
  
  // Use effective connection type if available
  if (effectiveType) {
    switch (effectiveType) {
      case '4g':
        return downlink && downlink > 10 ? 'excellent' : 'good'
      case '3g':
        return 'good'
      case '2g':
      case 'slow-2g':
        return 'poor'
      default:
        return 'good'
    }
  }
  
  // Fallback to RTT and downlink
  if (rtt && downlink) {
    if (rtt < 100 && downlink > 10) return 'excellent'
    if (rtt < 300 && downlink > 5) return 'good'
    if (rtt < 1000 && downlink > 1) return 'poor'
  }
  
  return 'good' // Default assumption
}

/**
 * Generate sync batch based on strategy
 */
function createSyncBatch(
  pending: OfflineAttendance[], 
  strategy: SyncStrategy, 
  batchSize: number
): OfflineAttendance[] {
  let sorted: OfflineAttendance[]
  
  switch (strategy) {
    case 'fifo':
      sorted = [...pending].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      break
    case 'lifo':
      sorted = [...pending].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      break
    case 'priority':
      sorted = [...pending].sort((a, b) => {
        // Priority: Today's attendance > Past attendance > Future attendance
        const now = new Date()
        const aDate = new Date(a.timestamp)
        const bDate = new Date(b.timestamp)
        const { start: todayStart, end: todayEnd } = getStartEndOfDay(now)
        
        const aIsToday = aDate >= todayStart && aDate < todayEnd
        const bIsToday = bDate >= todayStart && bDate < todayEnd
        
        if (aIsToday && !bIsToday) return -1
        if (!aIsToday && bIsToday) return 1
        
        // If both are today or both are not today, sort by timestamp
        return aDate.getTime() - bDate.getTime()
      })
      break
    default:
      sorted = pending
  }
  
  return sorted.slice(0, batchSize)
}

// ============================================================================
// OFFLINE STORE IMPLEMENTATION
// ============================================================================

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionQuality: 'excellent',
      networkInfo: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: undefined,
        downlink: undefined,
        rtt: undefined
      },
      lastConnected: new Date(),
      connectionHistory: [],
      
      pendingAttendance: [],
      failedSyncs: [],
      syncQueue: [],
      
      syncStatus: {
        pending: 0,
        synced: 0,
        failed: 0
      },
      syncStrategy: 'priority',
      autoSyncEnabled: true,
      syncInterval: OFFLINE_CONFIG.DEFAULT_SYNC_INTERVAL,
      maxRetries: OFFLINE_CONFIG.MAX_RETRIES,
      batchSize: OFFLINE_CONFIG.BATCH_SIZE,
      
      isSyncing: false,
      syncProgress: {
        total: 0,
        completed: 0,
        failed: 0
      },
      lastSyncAttempt: null,
      nextSyncScheduled: null,
      
      syncMetrics: {
        successRate: 100,
        averageSyncTime: 0,
        totalSynced: 0,
        totalFailed: 0,
        lastMetricsReset: new Date()
      },
      
      // ============================================================================
      // CONNECTION MANAGEMENT
      // ============================================================================
      
      setOnlineStatus: (online, quality) => {
        const now = new Date()
        const currentQuality = quality || (online ? 'excellent' : 'offline')
        
        set((state) => ({
          isOnline: online,
          connectionQuality: currentQuality,
          networkInfo: {
            ...state.networkInfo,
            isOnline: online
          },
          lastConnected: online ? now : state.lastConnected,
          connectionHistory: [
            ...state.connectionHistory.slice(-9), // Keep last 10 entries
            {
              timestamp: now,
              isOnline: online,
              quality: currentQuality
            }
          ],
          lastUpdated: now
        }))
        
        // Auto-sync when coming back online
        if (online && get().autoSyncEnabled && get().hasPendingData()) {
          setTimeout(() => get().syncPendingData(), 1000)
        }
      },
      
      updateConnectionQuality: (quality) => {
        set((state) => ({
          connectionQuality: quality,
          networkInfo: {
            ...state.networkInfo,
            isOnline: quality !== 'offline'
          },
          lastUpdated: new Date()
        }))
      },
      
      updateNetworkInfo: (info) => {
        const updatedInfo = { ...get().networkInfo, ...info }
        const quality = calculateConnectionQuality(updatedInfo)
        
        set({
          networkInfo: updatedInfo,
          connectionQuality: quality,
          isOnline: updatedInfo.isOnline,
          lastUpdated: new Date()
        })
      },
      
      testConnection: async () => {
        try {
          const startTime = performance.now()
          
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-cache'
          })
          
          const endTime = performance.now()
          const rtt = endTime - startTime
          
          if (response.ok) {
            const quality: ConnectionQuality = 
              rtt < 100 ? 'excellent' :
              rtt < 300 ? 'good' :
              rtt < 1000 ? 'poor' : 'offline'
            
            get().updateNetworkInfo({ rtt, isOnline: true })
            get().updateConnectionQuality(quality)
            
            return quality
          } else {
            get().updateConnectionQuality('poor')
            return 'poor'
          }
        } catch (error) {
          get().updateConnectionQuality('offline')
          get().setOnlineStatus(false)
          return 'offline'
        }
      },
      
      // ============================================================================
      // OFFLINE DATA MANAGEMENT
      // ============================================================================
      
      addPendingAttendance: (data) => {
        // Validate the attendance data
        const validation = get().validateOfflineAttendance(data)
        if (!validation.isValid || !validation.data) {
          throw new Error(`Invalid attendance data: ${validation.errors?.join(', ')}`)
        }
        
        const id = generateUniqueId('offline_attendance')
        const attendance: OfflineAttendance = {
          ...validation.data,
          id,
          retryCount: 0,
          lastAttempt: null
        }
        
        set((state) => ({
          pendingAttendance: [...state.pendingAttendance, attendance],
          syncStatus: {
            ...state.syncStatus,
            pending: state.syncStatus.pending + 1
          },
          lastUpdated: new Date()
        }))
        
        // Try immediate sync if online and auto-sync enabled
        if (get().isOnline && get().autoSyncEnabled && get().canSync()) {
          setTimeout(() => get().syncSingleAttendance(attendance), 500)
        }
        
        return id
      },
      
      removePendingAttendance: (id) => {
        set((state) => {
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
        })
      },
      
      updatePendingAttendance: (id, updates) => {
        set((state) => ({
          pendingAttendance: state.pendingAttendance.map(attendance =>
            attendance.id === id ? { ...attendance, ...updates } : attendance
          ),
          lastUpdated: new Date()
        }))
      },
      
      moveToFailedSync: (id, error) => {
        set((state) => {
          const attendance = state.pendingAttendance.find(a => a.id === id)
          if (!attendance) return state
          
          return {
            pendingAttendance: state.pendingAttendance.filter(a => a.id !== id),
            failedSyncs: [...state.failedSyncs, { 
              ...attendance, 
              retryCount: attendance.retryCount + 1,
              lastAttempt: new Date(),
              lastError: error
            }],
            syncStatus: {
              ...state.syncStatus,
              pending: Math.max(0, state.syncStatus.pending - 1),
              failed: state.syncStatus.failed + 1
            },
            lastUpdated: new Date()
          }
        })
      },
      
      retryFailedSync: async (id) => {
        const failedSync = get().failedSyncs.find(a => a.id === id)
        if (!failedSync) return false
        
        if (!get().shouldRetrySync(failedSync)) {
          console.warn('Retry limit exceeded for attendance:', id)
          return false
        }
        
        // Move back to pending queue
        set((state) => ({
          failedSyncs: state.failedSyncs.filter(a => a.id !== id),
          pendingAttendance: [...state.pendingAttendance, { 
            ...failedSync, 
            retryCount: 0,
            lastAttempt: null,
            lastError: undefined
          }],
          syncStatus: {
            ...state.syncStatus,
            pending: state.syncStatus.pending + 1,
            failed: Math.max(0, state.syncStatus.failed - 1)
          },
          lastUpdated: new Date()
        }))
        
        // Attempt sync
        return await get().syncSingleAttendance(failedSync)
      },
      
      clearPendingData: () => {
        set((state) => ({
          pendingAttendance: [],
          syncStatus: { 
            pending: 0, 
            synced: state.syncStatus.synced, 
            failed: state.syncStatus.failed 
          },
          lastUpdated: new Date()
        }))
      },
      
      clearFailedSyncs: () => {
        set((state) => ({
          failedSyncs: [],
          syncStatus: { 
            ...state.syncStatus, 
            failed: 0 
          },
          lastUpdated: new Date()
        }))
      },
      
      // ============================================================================
      // SYNC MANAGEMENT
      // ============================================================================
      
      syncSingleAttendance: async (attendance) => {
        if (!get().canSync()) {
          console.warn('Cannot sync: offline or poor connection')
          return false
        }
        
        const startTime = performance.now()
        
        try {
          // Update retry tracking
          get().updatePendingAttendance(attendance.id, {
            retryCount: attendance.retryCount + 1,
            lastAttempt: new Date()
          })
          
          // Validate QR data before sending
          const qrData = validateQRData(attendance.qrData)
          if (!qrData) {
            throw new Error('Invalid QR code data format')
          }
          
          // Send to server
          const response = await fetch(API_ROUTES.ATTENDANCE_SCAN, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Offline-Sync': 'true'
            },
            body: JSON.stringify({
              qrData: attendance.qrData,
              sessionId: attendance.sessionId,
              offlineTimestamp: attendance.timestamp,
              studentUuid: attendance.studentUuid,
              isOfflineSync: true
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
          }
          
          const result: ApiResponse<unknown> = await response.json()
          
          if (result.success) {
            // Update metrics
            const endTime = performance.now()
            const syncTime = endTime - startTime
            
            set((state) => ({
              syncMetrics: {
                ...state.syncMetrics,
                totalSynced: state.syncMetrics.totalSynced + 1,
                averageSyncTime: (state.syncMetrics.averageSyncTime + syncTime) / 2,
                successRate: ((state.syncMetrics.totalSynced + 1) / 
                  (state.syncMetrics.totalSynced + state.syncMetrics.totalFailed + 1)) * 100
              }
            }))
            
            // Remove from pending
            get().removePendingAttendance(attendance.id)
            
            return true
          } else {
            throw new Error(result.error || 'Sync failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
          console.error('Failed to sync attendance:', errorMessage)
          
          // Update metrics
          set((state) => ({
            syncMetrics: {
              ...state.syncMetrics,
              totalFailed: state.syncMetrics.totalFailed + 1,
              successRate: (state.syncMetrics.totalSynced / 
                (state.syncMetrics.totalSynced + state.syncMetrics.totalFailed + 1)) * 100
            }
          }))
          
          // Move to failed syncs if max retries exceeded
          if (attendance.retryCount >= get().maxRetries) {
            get().moveToFailedSync(attendance.id, errorMessage)
          } else if (isNetworkError(error)) {
            // Network error - retry later
            setTimeout(() => get().syncSingleAttendance(attendance), 
              Math.min(1000 * Math.pow(2, attendance.retryCount), 30000))
          } else {
            // Permanent error - move to failed
            get().moveToFailedSync(attendance.id, errorMessage)
          }
          
          return false
        }
      },
      
      syncPendingData: async () => {
        const { pendingAttendance, isOnline, isSyncing } = get()
        
        if (!isOnline || isSyncing || pendingAttendance.length === 0) {
          return {
            success: false,
            syncedCount: 0,
            failedCount: 0,
            errors: isOnline ? [] : ['Device is offline']
          }
        }
        
        set({ 
          isSyncing: true, 
          lastSyncAttempt: new Date(),
          syncProgress: {
            total: pendingAttendance.length,
            completed: 0,
            failed: 0
          }
        })
        
        const batch = createSyncBatch(
          pendingAttendance, 
          get().syncStrategy, 
          get().batchSize
        )
        
        let syncedCount = 0
        let failedCount = 0
        const errors: string[] = []
        
        try {
          for (const attendance of batch) {
            try {
              set((state) => ({
                syncProgress: {
                  ...state.syncProgress,
                  currentItem: `${attendance.studentNumber} - ${attendance.sessionId}`
                }
              }))
              
              const success = await get().syncSingleAttendance(attendance)
              
              if (success) {
                syncedCount++
              } else {
                failedCount++
                errors.push(`Failed to sync attendance for ${attendance.studentNumber}`)
              }
              
              set((state) => ({
                syncProgress: {
                  ...state.syncProgress,
                  completed: state.syncProgress.completed + 1,
                  failed: success ? state.syncProgress.failed : state.syncProgress.failed + 1
                }
              }))
              
              // Small delay between syncs to avoid overwhelming the server
              if (get().connectionQuality === 'poor') {
                await delay(1000)
              } else {
                await delay(100)
              }
            } catch (error) {
              failedCount++
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              errors.push(errorMessage)
            }
          }
          
          return {
            success: syncedCount > 0,
            syncedCount,
            failedCount,
            errors
          }
        } finally {
          set({ 
            isSyncing: false,
            syncProgress: {
              total: 0,
              completed: 0,
              failed: 0,
              currentItem: undefined
            }
          })
        }
      },
      
      scheduleBatchSync: () => {
        if (!get().autoSyncEnabled || get().nextSyncScheduled) return
        
        const nextSync = new Date(Date.now() + get().syncInterval)
        
        set({ nextSyncScheduled: nextSync })
        
        setTimeout(async () => {
          if (get().hasPendingData() && get().canSync()) {
            await get().syncPendingData()
          }
          set({ nextSyncScheduled: null })
          
          // Schedule next sync if auto-sync is still enabled
          if (get().autoSyncEnabled) {
            get().scheduleBatchSync()
          }
        }, get().syncInterval)
      },
      
      cancelScheduledSync: () => {
        set({ nextSyncScheduled: null })
      },
      
      forceSyncAll: async () => {
        // Force sync all pending and failed syncs
        const allItems = [...get().pendingAttendance, ...get().failedSyncs]
        
        // Move all failed syncs back to pending
        set((state) => ({
          pendingAttendance: [...state.pendingAttendance, ...state.failedSyncs.map(f => ({
            ...f,
            retryCount: 0,
            lastAttempt: null,
            lastError: undefined
          }))],
          failedSyncs: [],
          syncStatus: {
            ...state.syncStatus,
            pending: state.syncStatus.pending + state.failedSyncs.length,
            failed: 0
          }
        }))
        
        return await get().syncPendingData()
      },
      
      // ============================================================================
      // CONFIGURATION
      // ============================================================================
      
      setAutoSync: (enabled) => {
        set({ autoSyncEnabled: enabled })
        
        if (enabled) {
          get().scheduleBatchSync()
        } else {
          get().cancelScheduledSync()
        }
      },
      
      setSyncInterval: (interval) => {
        const clampedInterval = Math.max(
          OFFLINE_CONFIG.MIN_SYNC_INTERVAL, 
          Math.min(interval, OFFLINE_CONFIG.MAX_SYNC_INTERVAL)
        )
        
        set({ syncInterval: clampedInterval })
        
        // Reschedule if auto-sync is enabled
        if (get().autoSyncEnabled) {
          get().cancelScheduledSync()
          get().scheduleBatchSync()
        }
      },
      
      setSyncStrategy: (strategy) => {
        set({ syncStrategy: strategy })
      },
      
      setBatchSize: (size) => {
        const clampedSize = Math.max(1, Math.min(size, OFFLINE_CONFIG.MAX_BATCH_SIZE))
        set({ batchSize: clampedSize })
      },
      
      setMaxRetries: (retries) => {
        const clampedRetries = Math.max(0, Math.min(retries, 10))
        set({ maxRetries: clampedRetries })
      },
      
      // ============================================================================
      // GETTERS - DATA STATE
      // ============================================================================
      
      hasPendingData: () => {
        const { pendingAttendance, failedSyncs } = get()
        return pendingAttendance.length > 0 || failedSyncs.length > 0
      },
      
      getTotalPending: () => {
        const { pendingAttendance, failedSyncs } = get()
        return pendingAttendance.length + failedSyncs.length
      },
      
      getOldestPending: () => {
        const { pendingAttendance } = get()
        if (pendingAttendance.length === 0) return null
        
        return pendingAttendance.reduce((oldest, current) => 
          new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
        )
      },
      
      getPendingBySession: (sessionId) => {
        return get().pendingAttendance.filter(a => a.sessionId === sessionId)
      },
      
      getPendingByDate: (date) => {
        const { start, end } = getStartEndOfDay(date)
        return get().pendingAttendance.filter(a => {
          const timestamp = new Date(a.timestamp)
          return timestamp >= start && timestamp < end
        })
      },
      
      getFailedSyncs: () => get().failedSyncs,
      
      // ============================================================================
      // GETTERS - SYNC STATE
      // ============================================================================
      
      canSync: () => {
        const { isOnline, connectionQuality, isSyncing } = get()
        return isOnline && connectionQuality !== 'offline' && !isSyncing
      },
      
      getSyncProgress: () => {
        const { syncProgress } = get()
        if (syncProgress.total === 0) return 0
        return Math.round((syncProgress.completed / syncProgress.total) * 100)
      },
      
      getEstimatedSyncTime: () => {
        const { pendingAttendance, syncMetrics, connectionQuality } = get()
        const baseTime = syncMetrics.averageSyncTime || 1000
        
        const qualityMultiplier = {
          excellent: 1,
          good: 1.5,
          poor: 3,
          offline: Infinity
        }[connectionQuality]
        
        return pendingAttendance.length * baseTime * qualityMultiplier
      },
      
      getNextSyncTime: () => get().nextSyncScheduled,
      
      getSyncMetrics: () => get().syncMetrics,
      
      // ============================================================================
      // GETTERS - BUSINESS LOGIC
      // ============================================================================
      
      validateOfflineAttendance: (data) => {
        try {
          const validation = validateForm(offlineAttendanceSchema, data)
          
          if (!validation.isValid || !validation.data) {
            return {
              isValid: false,
              errors: ['Invalid attendance data format']
            }
          }
          
          const attendance = validation.data
          const errors: string[] = []
          
          // Validate QR data
          const qrData = validateQRData(attendance.qrData)
          if (!qrData) {
            errors.push('Invalid QR code format')
          }
          
          // Validate timestamp (not too old or in future)
          const timestamp = new Date(attendance.timestamp)
          const now = new Date()
          const maxAge = BUSINESS_RULES.OFFLINE_ATTENDANCE_MAX_AGE_HOURS * 60 * 60 * 1000
          
          if (timestamp > now) {
            errors.push('Attendance timestamp is in the future')
          } else if (now.getTime() - timestamp.getTime() > maxAge) {
            errors.push('Attendance data is too old to sync')
          }
          
          // Validate session context
          if (!attendance.sessionId || attendance.sessionId.trim().length === 0) {
            errors.push('Invalid session ID')
          }
          
          return {
            isValid: errors.length === 0,
            data: errors.length === 0 ? attendance : undefined,
            errors: errors.length > 0 ? errors : undefined
          }
        } catch (error) {
          return {
            isValid: false,
            errors: ['Failed to validate attendance data']
          }
        }
      },
      
      isAttendanceExpired: (attendance) => {
        const timestamp = new Date(attendance.timestamp)
        const now = new Date()
        const maxAge = BUSINESS_RULES.OFFLINE_ATTENDANCE_MAX_AGE_HOURS * 60 * 60 * 1000
        
        return now.getTime() - timestamp.getTime() > maxAge
      },
      
      shouldRetrySync: (attendance) => {
        return attendance.retryCount < get().maxRetries && 
               !get().isAttendanceExpired(attendance)
      },
      
      getConnectionStatus: () => get().connectionQuality,
      
      // ============================================================================
      // UTILITY ACTIONS
      // ============================================================================
      
      exportOfflineData: () => {
        const { pendingAttendance, failedSyncs, syncStatus, syncMetrics } = get()
        
        return [
          ...pendingAttendance.map(a => ({
            ...a,
            type: 'pending',
            exportedAt: new Date().toISOString()
          })),
          ...failedSyncs.map(a => ({
            ...a,
            type: 'failed',
            exportedAt: new Date().toISOString()
          }))
        ]
      },
      
      importOfflineData: async (data) => {
        let imported = 0
        const errors: string[] = []
        
        for (const item of data) {
          try {
            const validation = get().validateOfflineAttendance(item)
            
            if (validation.isValid && validation.data) {
              // Check for duplicates
              const existing = get().pendingAttendance.find(a => 
                a.studentUuid === validation.data!.studentUuid &&
                a.sessionId === validation.data!.sessionId &&
                Math.abs(new Date(a.timestamp).getTime() - new Date(validation.data!.timestamp).getTime()) < 60000
              )
              
              if (!existing) {
                get().addPendingAttendance(validation.data)
                imported++
              }
            } else {
              errors.push(`Invalid item: ${validation.errors?.join(', ')}`)
            }
          } catch (error) {
            errors.push(`Failed to import item: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        return { imported, errors }
      },
      
      clearAllData: () => {
        set({
          pendingAttendance: [],
          failedSyncs: [],
          syncQueue: [],
          syncStatus: { pending: 0, synced: 0, failed: 0 },
          lastUpdated: new Date()
        })
      },
      
      resetMetrics: () => {
        set({
          syncMetrics: {
            successRate: 100,
            averageSyncTime: 0,
            totalSynced: 0,
            totalFailed: 0,
            lastMetricsReset: new Date()
          }
        })
      },
      
      optimizeQueue: () => {
        // Remove expired attendance records
        const now = new Date()
        
        set((state) => {
          const validPending = state.pendingAttendance.filter(a => !get().isAttendanceExpired(a))
          const validFailed = state.failedSyncs.filter(a => !get().isAttendanceExpired(a))
          
          return {
            pendingAttendance: validPending,
            failedSyncs: validFailed,
            syncStatus: {
              pending: validPending.length,
              synced: state.syncStatus.synced,
              failed: validFailed.length
            },
            lastUpdated: now
          }
        })
      },
      
      diagnosticInfo: () => {
        const state = get()
        
        return {
          connection: {
            isOnline: state.isOnline,
            quality: state.connectionQuality,
            networkInfo: state.networkInfo,
            lastConnected: state.lastConnected?.toISOString(),
            connectionHistory: state.connectionHistory.slice(-5)
          },
          data: {
            pendingCount: state.pendingAttendance.length,
            failedCount: state.failedSyncs.length,
            oldestPending: state.getOldestPending()?.timestamp,
            hasPendingData: state.hasPendingData()
          },
          sync: {
            status: state.syncStatus,
            metrics: state.syncMetrics,
            isSyncing: state.isSyncing,
            canSync: state.canSync(),
            autoSyncEnabled: state.autoSyncEnabled,
            nextSyncScheduled: state.nextSyncScheduled?.toISOString()
          },
          config: {
            syncInterval: state.syncInterval,
            maxRetries: state.maxRetries,
            batchSize: state.batchSize,
            syncStrategy: state.syncStrategy
          },
          timestamp: new Date().toISOString()
        }
      }
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        // Persist offline data and configuration
        pendingAttendance: state.pendingAttendance,
        failedSyncs: state.failedSyncs,
        syncStatus: state.syncStatus,
        syncMetrics: state.syncMetrics,
        autoSyncEnabled: state.autoSyncEnabled,
        syncInterval: state.syncInterval,
        maxRetries: state.maxRetries,
        batchSize: state.batchSize,
        syncStrategy: state.syncStrategy,
        connectionHistory: state.connectionHistory.slice(-5) // Only keep recent history
      })
    }
  )
)

// ============================================================================
// BROWSER EVENT LISTENERS
// ============================================================================

if (typeof window !== 'undefined') {
  const store = useOfflineStore.getState()
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    store.setOnlineStatus(true)
    store.testConnection()
  })
  
  window.addEventListener('offline', () => {
    store.setOnlineStatus(false, 'offline')
  })
  
  // Listen for network information changes
  if ('connection' in navigator) {
    const connection = (navigator as unknown as { connection: NetworkInformation }).connection
    
    const updateNetworkInfo = () => {
      store.updateNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      })
    }
    
    connection.addEventListener('change', updateNetworkInfo)
    updateNetworkInfo() // Initial update
  }
  
  // Setup periodic sync scheduler
  const startPeriodicSync = () => {
    if (store.autoSyncEnabled) {
      store.scheduleBatchSync()
    }
  }
  
  // Start sync scheduler after a short delay
  setTimeout(startPeriodicSync, 2000)
  
  // Periodic connection quality testing
  setInterval(() => {
    if (store.isOnline) {
      store.testConnection()
    }
  }, 60000) // Test every minute
  
  // Periodic queue optimization
  setInterval(() => {
    store.optimizeQueue()
  }, 300000) // Clean up every 5 minutes
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for connection status
 */
export const useConnectionStatus = () => useOfflineStore(state => ({
  isOnline: state.isOnline,
  quality: state.connectionQuality,
  networkInfo: state.networkInfo,
  lastConnected: state.lastConnected,
  testConnection: state.testConnection
}))

/**
 * Hook for pending data management
 */
export const usePendingData = () => useOfflineStore(state => ({
  pending: state.pendingAttendance,
  failed: state.failedSyncs,
  total: state.getTotalPending(),
  hasPending: state.hasPendingData(),
  oldest: state.getOldestPending(),
  addPending: state.addPendingAttendance,
  clearPending: state.clearPendingData,
  clearFailed: state.clearFailedSyncs
}))

/**
 * Hook for sync management
 */
export const useSyncControls = () => useOfflineStore(state => ({
  isSyncing: state.isSyncing,
  canSync: state.canSync(),
  progress: state.getSyncProgress(),
  estimatedTime: state.getEstimatedSyncTime(),
  metrics: state.getSyncMetrics(),
  syncPending: state.syncPendingData,
  forceSyncAll: state.forceSyncAll,
  autoSyncEnabled: state.autoSyncEnabled,
  setAutoSync: state.setAutoSync
}))

/**
 * Hook for offline configuration
 */
export const useOfflineConfig = () => useOfflineStore(state => ({
  syncInterval: state.syncInterval,
  maxRetries: state.maxRetries,
  batchSize: state.batchSize,
  syncStrategy: state.syncStrategy,
  setSyncInterval: state.setSyncInterval,
  setMaxRetries: state.setMaxRetries,
  setBatchSize: state.setBatchSize,
  setSyncStrategy: state.setSyncStrategy
}))