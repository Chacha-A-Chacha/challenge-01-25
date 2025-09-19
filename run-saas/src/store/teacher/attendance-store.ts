// store/teacher/attendance-store.ts
import { create } from 'zustand'
import type { 
  Session, 
  AttendanceRecord, 
  AttendanceStats, 
  SessionWithAttendance,
  QRScanResult,
  AttendanceStatus,
  BaseStoreState 
} from '@/types'

interface AttendanceState extends BaseStoreState {
  // Current session data
  currentSession: Session | null
  todayAttendance: AttendanceRecord[]
  sessionStats: AttendanceStats | null
  
  // Scanning state
  isScanning: boolean
  scanError: string | null
  lastScanResult: QRScanResult | null
  
  // Session management
  availableSessions: Session[]
  selectedSessionId: string | null
  
  // Actions
  setCurrentSession: (session: Session) => void
  addAttendanceRecord: (record: AttendanceRecord) => void
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void
  removeAttendanceRecord: (id: string) => void
  setScanning: (isScanning: boolean) => void
  setScanError: (error: string | null) => void
  setLastScanResult: (result: QRScanResult) => void
  clearTodayAttendance: () => void
  loadSessionAttendance: (sessionId: string) => Promise<void>
  
  // Session management
  setAvailableSessions: (sessions: Session[]) => void
  selectSession: (sessionId: string) => void
  
  // Computed getters
  getPresentCount: () => number
  getAbsentCount: () => number
  getWrongSessionCount: () => number
  getAttendanceRate: () => number
  getSessionCapacity: () => number
  getAvailableSpots: () => number
  
  // Utility actions
  markManualAttendance: (studentId: string, status: AttendanceStatus) => void
  bulkMarkAbsent: (studentIds: string[]) => void
  exportAttendanceData: () => any[]
  resetState: () => void
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  currentSession: null,
  todayAttendance: [],
  sessionStats: null,
  
  isScanning: false,
  scanError: null,
  lastScanResult: null,
  
  availableSessions: [],
  selectedSessionId: null,
  
  // Session management
  setCurrentSession: (session) => {
    set({ 
      currentSession: session,
      selectedSessionId: session.id,
      lastUpdated: new Date()
    })
  },
  
  // Attendance management
  addAttendanceRecord: (record) => set((state) => ({
    todayAttendance: [...state.todayAttendance, record],
    lastUpdated: new Date()
  })),
  
  updateAttendanceRecord: (id, updates) => set((state) => ({
    todayAttendance: state.todayAttendance.map(record =>
      record.id === id ? { ...record, ...updates } : record
    ),
    lastUpdated: new Date()
  })),
  
  removeAttendanceRecord: (id) => set((state) => ({
    todayAttendance: state.todayAttendance.filter(record => record.id !== id),
    lastUpdated: new Date()
  })),
  
  // Scanning controls
  setScanning: (isScanning) => set({ isScanning }),
  setScanError: (error) => set({ scanError: error }),
  setLastScanResult: (result) => set({ lastScanResult: result }),
  clearTodayAttendance: () => set({ 
    todayAttendance: [],
    sessionStats: null,
    lastUpdated: new Date()
  }),
  
  // Load attendance data
  loadSessionAttendance: async (sessionId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/attendance/session/${sessionId}`)
      if (!response.ok) throw new Error('Failed to load attendance')
      
      const data = await response.json()
      
      set({ 
        todayAttendance: data.attendance || [],
        sessionStats: data.stats || null,
        isLoading: false,
        lastUpdated: new Date()
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Session management
  setAvailableSessions: (sessions) => set({ 
    availableSessions: sessions,
    lastUpdated: new Date()
  }),
  
  selectSession: (sessionId) => {
    const session = get().availableSessions.find(s => s.id === sessionId)
    if (session) {
      get().setCurrentSession(session)
      get().loadSessionAttendance(sessionId)
    }
  },
  
  // Computed getters
  getPresentCount: () => 
    get().todayAttendance.filter(r => r.status === 'PRESENT').length,
  
  getAbsentCount: () => 
    get().todayAttendance.filter(r => r.status === 'ABSENT').length,
  
  getWrongSessionCount: () => 
    get().todayAttendance.filter(r => r.status === 'WRONG_SESSION').length,
  
  getAttendanceRate: () => {
    const { todayAttendance } = get()
    if (todayAttendance.length === 0) return 0
    const present = todayAttendance.filter(r => r.status === 'PRESENT').length
    return Math.round((present / todayAttendance.length) * 100)
  },
  
  getSessionCapacity: () => get().currentSession?.capacity || 0,
  
  getAvailableSpots: () => {
    const capacity = get().getSessionCapacity()
    const enrolled = get().todayAttendance.length
    return Math.max(0, capacity - enrolled)
  },
  
  // Manual attendance marking
  markManualAttendance: (studentId, status) => {
    const existingIndex = get().todayAttendance.findIndex(r => r.studentId === studentId)
    
    if (existingIndex >= 0) {
      get().updateAttendanceRecord(get().todayAttendance[existingIndex].id, { status })
    } else {
      // Create new attendance record for manual marking
      const newRecord: AttendanceRecord = {
        id: `manual_${Date.now()}`,
        studentId,
        studentName: 'Manual Entry', // This should be fetched from API
        studentNumber: 'MANUAL',
        sessionId: get().currentSession?.id || '',
        date: new Date().toISOString().split('T')[0],
        status,
        scanTime: new Date().toISOString(),
        markedBy: 'manual'
      }
      get().addAttendanceRecord(newRecord)
    }
  },
  
  // Bulk operations
  bulkMarkAbsent: (studentIds) => {
    studentIds.forEach(studentId => {
      get().markManualAttendance(studentId, 'ABSENT')
    })
  },
  
  // Export functionality
  exportAttendanceData: () => {
    const { todayAttendance, currentSession } = get()
    return todayAttendance.map(record => ({
      studentNumber: record.studentNumber,
      studentName: record.studentName,
      status: record.status,
      scanTime: record.scanTime,
      session: currentSession?.day + ' ' + currentSession?.startTime + '-' + currentSession?.endTime,
      date: record.date
    }))
  },
  
  // Reset state
  resetState: () => set({
    currentSession: null,
    todayAttendance: [],
    sessionStats: null,
    isScanning: false,
    scanError: null,
    lastScanResult: null,
    selectedSessionId: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  })
}))

// Selectors for performance optimization
export const useCurrentSession = () => useAttendanceStore(state => state.currentSession)
export const useTodayAttendance = () => useAttendanceStore(state => state.todayAttendance)
export const useAttendanceStats = () => useAttendanceStore(state => ({
  presentCount: state.getPresentCount(),
  absentCount: state.getAbsentCount(),
  wrongSessionCount: state.getWrongSessionCount(),
  attendanceRate: state.getAttendanceRate(),
  capacity: state.getSessionCapacity(),
  availableSpots: state.getAvailableSpots()
}))
export const useScanningState = () => useAttendanceStore(state => ({
  isScanning: state.isScanning,
  scanError: state.scanError,
  lastScanResult: state.lastScanResult
}))
