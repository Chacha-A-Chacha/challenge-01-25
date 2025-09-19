// store/student/schedule-store.ts
import { create } from 'zustand'
import type { 
  Session, 
  Class, 
  Course, 
  StudentSchedule,
  AttendanceRecord,
  StudentAttendanceHistory,
  BaseStoreState,
  ApiResponse 
} from '@/types'

interface ScheduleState extends BaseStoreState {
  // Schedule data
  schedule: StudentSchedule | null
  saturdaySession: Session | null
  sundaySession: Session | null
  
  // Attendance history
  attendanceHistory: AttendanceRecord[]
  attendanceStats: {
    totalSessions: number
    attendedSessions: number
    missedSessions: number
    wrongSessionCount: number
    attendanceRate: number
  } | null
  
  // Current session info
  currentSessionInfo: {
    isSessionTime: boolean
    currentSession: Session | null
    nextSession: Session | null
    timeUntilNext?: number
  } | null
  
  // Actions
  loadSchedule: () => Promise<void>
  loadAttendanceHistory: (limit?: number) => Promise<void>
  refreshCurrentSessionInfo: () => void
  
  // Getters
  getUpcomingSession: () => Session | null
  isCurrentlyInSession: () => boolean
  getNextSessionCountdown: () => { hours: number; minutes: number; seconds: number } | null
  getTodaysSessions: () => Session[]
  canGenerateQR: () => boolean
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  schedule: null,
  saturdaySession: null,
  sundaySession: null,
  
  attendanceHistory: [],
  attendanceStats: null,
  
  currentSessionInfo: null,
  
  // Load student's schedule
  loadSchedule: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/student/schedule')
      const data: ApiResponse<StudentSchedule> = await response.json()
      
      if (data.success && data.data) {
        const schedule = data.data
        
        set({ 
          schedule,
          saturdaySession: schedule.saturdaySession || null,
          sundaySession: schedule.sundaySession || null,
          isLoading: false,
          lastUpdated: new Date()
        })
        
        // Update current session info
        get().refreshCurrentSessionInfo()
      } else {
        throw new Error(data.error || 'Failed to load schedule')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Load attendance history
  loadAttendanceHistory: async (limit = 50) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/student/attendance?limit=${limit}`)
      const data: ApiResponse<StudentAttendanceHistory> = await response.json()
      
      if (data.success && data.data) {
        const { attendanceRecords, ...stats } = data.data
        
        set({ 
          attendanceHistory: attendanceRecords,
          attendanceStats: {
            totalSessions: stats.totalSessions,
            attendedSessions: stats.presentSessions,
            missedSessions: stats.absentSessions,
            wrongSessionCount: stats.wrongSessionCount,
            attendanceRate: stats.attendanceRate
          },
          isLoading: false,
          lastUpdated: new Date()
        })
      } else {
        throw new Error(data.error || 'Failed to load attendance history')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Refresh current session information
  refreshCurrentSessionInfo: () => {
    const { saturdaySession, sundaySession } = get()
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
    
    let currentSession: Session | null = null
    let nextSession: Session | null = null
    let isSessionTime = false
    
    // Determine current and next sessions based on day and time
    const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight
    
    if (currentDay === 6 && saturdaySession) { // Saturday
      const sessionStart = parseTime(saturdaySession.startTime)
      const sessionEnd = parseTime(saturdaySession.endTime)
      
      if (currentTime >= sessionStart && currentTime <= sessionEnd) {
        currentSession = saturdaySession
        isSessionTime = true
      } else if (currentTime < sessionStart) {
        nextSession = saturdaySession
      } else if (sundaySession) {
        nextSession = sundaySession
      }
    } else if (currentDay === 0 && sundaySession) { // Sunday
      const sessionStart = parseTime(sundaySession.startTime)
      const sessionEnd = parseTime(sundaySession.endTime)
      
      if (currentTime >= sessionStart && currentTime <= sessionEnd) {
        currentSession = sundaySession
        isSessionTime = true
      } else if (currentTime < sessionStart) {
        nextSession = sundaySession
      } else if (saturdaySession) {
        // Next Saturday
        nextSession = saturdaySession
      }
    } else {
      // Determine next session
      if (currentDay < 6 && saturdaySession) {
        nextSession = saturdaySession
      } else if ((currentDay === 6 && currentTime > parseTime(saturdaySession?.endTime || '23:59')) && sundaySession) {
        nextSession = sundaySession
      } else if (currentDay > 0 && saturdaySession) {
        nextSession = saturdaySession
      }
    }
    
    // Calculate time until next session
    let timeUntilNext: number | undefined
    if (nextSession) {
      const nextSessionDate = getNextSessionDate(nextSession, now)
      timeUntilNext = nextSessionDate.getTime() - now.getTime()
    }
    
    set({
      currentSessionInfo: {
        isSessionTime,
        currentSession,
        nextSession,
        timeUntilNext
      },
      lastUpdated: new Date()
    })
  },
  
  // Getters
  getUpcomingSession: () => {
    const { currentSessionInfo } = get()
    return currentSessionInfo?.nextSession || null
  },
  
  isCurrentlyInSession: () => {
    const { currentSessionInfo } = get()
    return currentSessionInfo?.isSessionTime || false
  },
  
  getNextSessionCountdown: () => {
    const { currentSessionInfo } = get()
    if (!currentSessionInfo?.timeUntilNext || currentSessionInfo.timeUntilNext <= 0) {
      return null
    }
    
    const totalSeconds = Math.floor(currentSessionInfo.timeUntilNext / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return { hours, minutes, seconds }
  },
  
  getTodaysSessions: () => {
    const { saturdaySession, sundaySession } = get()
    const now = new Date()
    const currentDay = now.getDay()
    
    if (currentDay === 6 && saturdaySession) {
      return [saturdaySession]
    } else if (currentDay === 0 && sundaySession) {
      return [sundaySession]
    }
    
    return []
  },
  
  canGenerateQR: () => {
    const { currentSessionInfo } = get()
    // Allow QR generation 30 minutes before session starts until session ends
    if (!currentSessionInfo?.nextSession && !currentSessionInfo?.currentSession) {
      return false
    }
    
    const now = new Date()
    const session = currentSessionInfo.currentSession || currentSessionInfo.nextSession
    
    if (!session) return false
    
    const sessionDate = getNextSessionDate(session, now)
    const sessionStart = sessionDate.getTime()
    const sessionEnd = sessionStart + (parseTime(session.endTime) - parseTime(session.startTime)) * 60 * 1000
    const thirtyMinutesBefore = sessionStart - 30 * 60 * 1000
    
    const currentTime = now.getTime()
    
    return currentTime >= thirtyMinutesBefore && currentTime <= sessionEnd
  }
}))

// Utility functions
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function getNextSessionDate(session: Session, currentDate: Date): Date {
  const now = new Date(currentDate)
  const currentDay = now.getDay()
  const sessionDay = session.day === 'SATURDAY' ? 6 : 0
  
  let daysUntil = sessionDay - currentDay
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  } else if (daysUntil === 0) {
    // Same day - check if session time has passed
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const sessionStart = parseTime(session.startTime)
    
    if (currentTime > sessionStart) {
      daysUntil = 7 // Next week
    }
  }
  
  const sessionDate = new Date(now)
  sessionDate.setDate(now.getDate() + daysUntil)
  
  const [hours, minutes] = session.startTime.split(':').map(Number)
  sessionDate.setHours(hours, minutes, 0, 0)
  
  return sessionDate
}

// Auto-refresh current session info every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useScheduleStore.getState()
    if (state.schedule) {
      state.refreshCurrentSessionInfo()
    }
  }, 60000) // Every minute
}

// Selectors for performance
export const useStudentSchedule = () => useScheduleStore(state => ({
  schedule: state.schedule,
  saturday: state.saturdaySession,
  sunday: state.sundaySession,
  isLoading: state.isLoading,
  error: state.error
}))

export const useCurrentSession = () => useScheduleStore(state => ({
  info: state.currentSessionInfo,
  isInSession: state.isCurrentlyInSession(),
  upcomingSession: state.getUpcomingSession(),
  countdown: state.getNextSessionCountdown(),
  todaysSessions: state.getTodaysSessions(),
  canGenerateQR: state.canGenerateQR()
}))

export const useAttendanceHistory = () => useScheduleStore(state => ({
  history: state.attendanceHistory,
  stats: state.attendanceStats,
  loadHistory: state.loadAttendanceHistory
}))
