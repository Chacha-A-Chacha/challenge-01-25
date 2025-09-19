// store/teacher/class-store.ts
import { create } from 'zustand'
import type { 
  Class, 
  Session, 
  ClassFormData, 
  SessionFormData,
  WeekDay,
  EntityStoreState,
  ApiResponse 
} from '@/types'

interface ClassState extends EntityStoreState<Class> {
  // Class management
  classes: Class[]
  selectedClass: Class | null
  
  // Session management
  sessions: Session[]
  selectedSession: Session | null
  sessionsByClass: Record<string, Session[]>
  
  // Form states
  isCreatingClass: boolean
  isCreatingSession: boolean
  createClassError: string | null
  createSessionError: string | null
  
  // Actions - Class management
  loadClasses: () => Promise<void>
  createClass: (data: ClassFormData) => Promise<boolean>
  updateClass: (id: string, updates: Partial<Class>) => Promise<boolean>
  deleteClass: (id: string) => Promise<boolean>
  
  // Actions - Session management
  loadSessions: (classId: string) => Promise<void>
  createSession: (classId: string, data: SessionFormData) => Promise<boolean>
  updateSession: (id: string, updates: Partial<Session>) => Promise<boolean>
  deleteSession: (id: string) => Promise<boolean>
  validateSessionTime: (classId: string, day: WeekDay, startTime: string, endTime: string, excludeId?: string) => boolean
  
  // Selection
  selectClass: (classObj: Class | null) => void
  selectSession: (session: Session | null) => void
  
  // Getters
  getClassById: (id: string) => Class | undefined
  getSessionById: (id: string) => Session | undefined
  getSessionsByClass: (classId: string) => Session[]
  getSaturdaySessions: (classId: string) => Session[]
  getSundaySessions: (classId: string) => Session[]
  getClassCapacityUsage: (classId: string) => { total: number; used: number; available: number }
  hasTimeConflict: (classId: string, day: WeekDay, startTime: string, endTime: string, excludeId?: string) => boolean
}

export const useClassStore = create<ClassState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  items: [],
  classes: [],
  selectedItem: null,
  selectedClass: null,
  searchQuery: '',
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  },
  
  sessions: [],
  selectedSession: null,
  sessionsByClass: {},
  
  isCreatingClass: false,
  isCreatingSession: false,
  createClassError: null,
  createSessionError: null,
  
  // Load classes for current course
  loadClasses: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/classes')
      const data: ApiResponse<Class[]> = await response.json()
      
      if (data.success && data.data) {
        set({ 
          classes: data.data,
          items: data.data,
          isLoading: false,
          lastUpdated: new Date()
        })
      } else {
        throw new Error(data.error || 'Failed to load classes')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Create new class
  createClass: async (data) => {
    set({ isCreatingClass: true, createClassError: null })
    
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result: ApiResponse<Class> = await response.json()
      
      if (result.success && result.data) {
        set((state) => ({
          classes: [...state.classes, result.data!],
          items: [...state.items, result.data!],
          isCreatingClass: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to create class')
      }
    } catch (error) {
      set({ 
        createClassError: error instanceof Error ? error.message : 'Unknown error',
        isCreatingClass: false
      })
      return false
    }
  },
  
  // Update class
  updateClass: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result: ApiResponse<Class> = await response.json()
      
      if (result.success && result.data) {
        set((state) => ({
          classes: state.classes.map(cls => 
            cls.id === id ? { ...cls, ...result.data } : cls
          ),
          items: state.items.map(cls => 
            cls.id === id ? { ...cls, ...result.data } : cls
          ),
          selectedClass: state.selectedClass?.id === id 
            ? { ...state.selectedClass, ...result.data } 
            : state.selectedClass,
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to update class')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Delete class
  deleteClass: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE'
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set((state) => ({
          classes: state.classes.filter(cls => cls.id !== id),
          items: state.items.filter(cls => cls.id !== id),
          selectedClass: state.selectedClass?.id === id ? null : state.selectedClass,
          // Also remove sessions for this class
          sessions: state.sessions.filter(session => session.classId !== id),
          sessionsByClass: Object.fromEntries(
            Object.entries(state.sessionsByClass).filter(([classId]) => classId !== id)
          ),
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to delete class')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Load sessions for a class
  loadSessions: async (classId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/sessions?classId=${classId}`)
      const data: ApiResponse<Session[]> = await response.json()
      
      if (data.success && data.data) {
        set((state) => ({ 
          sessions: data.data!,
          sessionsByClass: {
            ...state.sessionsByClass,
            [classId]: data.data!
          },
          isLoading: false,
          lastUpdated: new Date()
        }))
      } else {
        throw new Error(data.error || 'Failed to load sessions')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Create new session
  createSession: async (classId, data) => {
    set({ isCreatingSession: true, createSessionError: null })
    
    // Validate session time doesn't conflict
    if (get().hasTimeConflict(classId, data.day, data.startTime, data.endTime)) {
      set({ 
        createSessionError: 'Session time conflicts with existing session',
        isCreatingSession: false
      })
      return false
    }
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, classId })
      })
      
      const result: ApiResponse<Session> = await response.json()
      
      if (result.success && result.data) {
        set((state) => ({
          sessions: [...state.sessions, result.data!],
          sessionsByClass: {
            ...state.sessionsByClass,
            [classId]: [...(state.sessionsByClass[classId] || []), result.data!]
          },
          isCreatingSession: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to create session')
      }
    } catch (error) {
      set({ 
        createSessionError: error instanceof Error ? error.message : 'Unknown error',
        isCreatingSession: false
      })
      return false
    }
  },
  
  // Update session
  updateSession: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result: ApiResponse<Session> = await response.json()
      
      if (result.success && result.data) {
        set((state) => {
          const updatedSessions = state.sessions.map(session => 
            session.id === id ? { ...session, ...result.data } : session
          )
          
          // Update sessionsByClass
          const updatedSessionsByClass = { ...state.sessionsByClass }
          Object.keys(updatedSessionsByClass).forEach(classId => {
            updatedSessionsByClass[classId] = updatedSessionsByClass[classId].map(session =>
              session.id === id ? { ...session, ...result.data } : session
            )
          })
          
          return {
            sessions: updatedSessions,
            sessionsByClass: updatedSessionsByClass,
            selectedSession: state.selectedSession?.id === id 
              ? { ...state.selectedSession, ...result.data } 
              : state.selectedSession,
            isLoading: false,
            lastUpdated: new Date()
          }
        })
        return true
      } else {
        throw new Error(result.error || 'Failed to update session')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Delete session
  deleteSession: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE'
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set((state) => {
          const filteredSessions = state.sessions.filter(session => session.id !== id)
          
          // Update sessionsByClass
          const updatedSessionsByClass = { ...state.sessionsByClass }
          Object.keys(updatedSessionsByClass).forEach(classId => {
            updatedSessionsByClass[classId] = updatedSessionsByClass[classId].filter(
              session => session.id !== id
            )
          })
          
          return {
            sessions: filteredSessions,
            sessionsByClass: updatedSessionsByClass,
            selectedSession: state.selectedSession?.id === id ? null : state.selectedSession,
            isLoading: false,
            lastUpdated: new Date()
          }
        })
        return true
      } else {
        throw new Error(result.error || 'Failed to delete session')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Validate session time
  validateSessionTime: (classId, day, startTime, endTime, excludeId) => {
    return !get().hasTimeConflict(classId, day, startTime, endTime, excludeId)
  },
  
  // Selection
  selectClass: (classObj) => set({ 
    selectedClass: classObj,
    selectedItem: classObj
  }),
  
  selectSession: (session) => set({ selectedSession: session }),
  
  // Getters
  getClassById: (id) => get().classes.find(c => c.id === id),
  getSessionById: (id) => get().sessions.find(s => s.id === id),
  getSessionsByClass: (classId) => get().sessionsByClass[classId] || [],
  
  getSaturdaySessions: (classId) => 
    get().getSessionsByClass(classId).filter(s => s.day === WeekDay.SATURDAY),
  
  getSundaySessions: (classId) => 
    get().getSessionsByClass(classId).filter(s => s.day === WeekDay.SUNDAY),
  
  getClassCapacityUsage: (classId) => {
    const sessions = get().getSessionsByClass(classId)
    const totalCapacity = sessions.reduce((sum, session) => sum + session.capacity, 0)
    const usedCapacity = sessions.reduce((sum, session) => sum + (session.students?.length || 0), 0)
    
    return {
      total: totalCapacity,
      used: usedCapacity,
      available: totalCapacity - usedCapacity
    }
  },
  
  hasTimeConflict: (classId, day, startTime, endTime, excludeId) => {
    const sessions = get().getSessionsByClass(classId)
    
    return sessions.some(session => {
      if (excludeId && session.id === excludeId) return false
      if (session.day !== day) return false
      
      // Check for time overlap
      const sessionStart = session.startTime
      const sessionEnd = session.endTime
      
      return (
        (startTime >= sessionStart && startTime < sessionEnd) ||
        (endTime > sessionStart && endTime <= sessionEnd) ||
        (startTime <= sessionStart && endTime >= sessionEnd)
      )
    })
  }
}))

// Selectors for performance
export const useClasses = () => useClassStore(state => state.classes)
export const useSelectedClass = () => useClassStore(state => state.selectedClass)
export const useSessionsByClass = (classId: string) => 
  useClassStore(state => state.getSessionsByClass(classId))
export const useClassSessions = (classId: string) => useClassStore(state => ({
  saturday: state.getSaturdaySessions(classId),
  sunday: state.getSundaySessions(classId),
  all: state.getSessionsByClass(classId)
}))
export const useClassCreation = () => useClassStore(state => ({
  isCreating: state.isCreatingClass,
  error: state.createClassError,
  createClass: state.createClass
}))
export const useSessionCreation = () => useClassStore(state => ({
  isCreating: state.isCreatingSession,
  error: state.createSessionError,
  createSession: state.createSession,
  validateTime: state.validateSessionTime
}))
