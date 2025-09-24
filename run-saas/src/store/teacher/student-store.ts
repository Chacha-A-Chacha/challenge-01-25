// store/teacher/student-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BaseStoreState,
  Student,
  Session,
  ApiResponse
} from '@/types'
import { API_ROUTES } from '@/lib/constants'
import { fetchWithTimeout } from '@/lib/utils'

// ============================================================================
// TYPES - Only what's needed for student state
// ============================================================================

interface StudentWithSessions extends Student {
  sessions: Session[]
}

interface StudentFilters {
  search: string
  classId: string | 'all'
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
  students: Student[]
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface StudentState extends BaseStoreState {
  // Core data
  students: StudentWithSessions[]
  selectedStudent: StudentWithSessions | null

  // UI state
  filters: StudentFilters

  // Import state
  isImporting: boolean
  importResult: ImportResult | null

  // Loading states
  isLoading: boolean

  // Actions
  loadStudents: (classId?: string) => Promise<void>
  importStudents: (file: File, classId: string) => Promise<boolean>
  updateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>
  deleteStudent: (id: string) => Promise<boolean>
  autoAssignStudents: (classId: string) => Promise<boolean>
  selectStudent: (student: StudentWithSessions | null) => void

  // Computed
  getFilteredStudents: () => StudentWithSessions[]
  getStudentsByClass: (classId: string) => StudentWithSessions[]
  getUnassignedStudents: () => StudentWithSessions[]

  // Utils
  setFilters: (filters: Partial<StudentFilters>) => void
  clearImportResult: () => void
  clearErrors: () => void
  reset: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FILTERS: StudentFilters = {
  search: '',
  classId: 'all'
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      students: [],
      selectedStudent: null,

      // UI state
      filters: DEFAULT_FILTERS,

      // Import state
      isImporting: false,
      importResult: null,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadStudents: async (classId) => {
        set({ isLoading: true, error: null })

        try {
          const url = classId ? `${API_ROUTES.STUDENTS}?classId=${classId}` : API_ROUTES.STUDENTS
          const response = await fetchWithTimeout(url)

          if (!response.ok) {
            throw new Error(`Failed to load students: ${response.status}`)
          }

          const result: ApiResponse<StudentWithSessions[]> = await response.json()

          if (result.success && result.data) {
            set({
              students: result.data,
              isLoading: false,
              lastUpdated: new Date()
            })
          } else {
            throw new Error(result.error || 'Failed to load students')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load students'
          set({
            error: errorMessage,
            isLoading: false
          })
        }
      },

      importStudents: async (file, classId) => {
        set({ isImporting: true, error: null })

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('classId', classId)

          const response = await fetchWithTimeout(`${API_ROUTES.STUDENTS}/import`, {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error(`Import failed: ${response.status}`)
          }

          const result: ApiResponse<ImportResult> = await response.json()

          if (result.success && result.data) {
            set({
              importResult: result.data,
              isImporting: false,
              lastUpdated: new Date()
            })

            // Reload students
            await get().loadStudents(classId)
            return true
          } else {
            throw new Error(result.error || 'Import failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Import failed'
          set({
            error: errorMessage,
            isImporting: false
          })
          return false
        }
      },

      updateStudent: async (id, updates) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENTS}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })

          if (!response.ok) {
            throw new Error(`Update failed: ${response.status}`)
          }

          const result: ApiResponse<StudentWithSessions> = await response.json()

          if (result.success && result.data) {
            set(state => ({
              students: state.students.map(student =>
                student.id === id ? result.data! : student
              ),
              selectedStudent: state.selectedStudent?.id === id
                ? result.data
                : state.selectedStudent,
              isLoading: false,
              lastUpdated: new Date()
            }))

            return true
          } else {
            throw new Error(result.error || 'Update failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Update failed'
          set({
            error: errorMessage,
            isLoading: false
          })
          return false
        }
      },

      deleteStudent: async (id) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENTS}/${id}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`)
          }

          const result: ApiResponse<void> = await response.json()

          if (result.success) {
            set(state => ({
              students: state.students.filter(student => student.id !== id),
              selectedStudent: state.selectedStudent?.id === id ? null : state.selectedStudent,
              isLoading: false,
              lastUpdated: new Date()
            }))

            return true
          } else {
            throw new Error(result.error || 'Delete failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Delete failed'
          set({
            error: errorMessage,
            isLoading: false
          })
          return false
        }
      },

      autoAssignStudents: async (classId) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetchWithTimeout(`${API_ROUTES.STUDENTS}/auto-assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId })
          })

          if (!response.ok) {
            throw new Error(`Auto-assignment failed: ${response.status}`)
          }

          const result: ApiResponse<void> = await response.json()

          if (result.success) {
            set({ isLoading: false, lastUpdated: new Date() })
            // Reload students to get updated assignments
            await get().loadStudents(classId)
            return true
          } else {
            throw new Error(result.error || 'Auto-assignment failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Auto-assignment failed'
          set({
            error: errorMessage,
            isLoading: false
          })
          return false
        }
      },

      selectStudent: (student) => {
        set({ selectedStudent: student })
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getFilteredStudents: () => {
        const { students, filters } = get()
        let filtered = [...students]

        // Search filter
        if (filters.search.trim()) {
          const query = filters.search.toLowerCase()
          filtered = filtered.filter(student =>
            student.studentNumber.toLowerCase().includes(query) ||
            student.firstName.toLowerCase().includes(query) ||
            (student.lastName && student.lastName.toLowerCase().includes(query)) ||
            student.email.toLowerCase().includes(query)
          )
        }

        // Class filter
        if (filters.classId !== 'all') {
          filtered = filtered.filter(student => student.classId === filters.classId)
        }

        return filtered
      },

      getStudentsByClass: (classId) => {
        return get().students.filter(student => student.classId === classId)
      },

      getUnassignedStudents: () => {
        return get().students.filter(student => !student.sessions || student.sessions.length < 2)
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      setFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }))
      },

      clearImportResult: () => {
        set({ importResult: null })
      },

      clearErrors: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          students: [],
          selectedStudent: null,
          filters: DEFAULT_FILTERS,
          isImporting: false,
          importResult: null,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'student-store',
      partialize: (state) => ({
        // Only persist user preferences
        selectedStudent: state.selectedStudent,
        filters: state.filters
        // Don't persist: student data, loading states, errors, import results
      })
    }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for student data and operations
 */
export function useStudents() {
  return useStudentStore(state => ({
    students: state.students,
    filteredStudents: state.getFilteredStudents(),
    selectedStudent: state.selectedStudent,
    isLoading: state.isLoading,
    error: state.error,
    loadStudents: state.loadStudents,
    selectStudent: state.selectStudent,
    getStudentsByClass: state.getStudentsByClass,
    getUnassignedStudents: state.getUnassignedStudents
  }))
}

/**
 * Hook for student management actions
 */
export function useStudentActions() {
  return useStudentStore(state => ({
    updateStudent: state.updateStudent,
    deleteStudent: state.deleteStudent,
    autoAssignStudents: state.autoAssignStudents,
    isLoading: state.isLoading,
    error: state.error,
    clearErrors: state.clearErrors
  }))
}

/**
 * Hook for student import functionality
 */
export function useStudentImport() {
  return useStudentStore(state => ({
    isImporting: state.isImporting,
    importResult: state.importResult,
    importStudents: state.importStudents,
    clearImportResult: state.clearImportResult
  }))
}

/**
 * Hook for filtering and search
 */
export function useStudentFilters() {
  return useStudentStore(state => ({
    filters: state.filters,
    setFilters: state.setFilters,
    filteredStudents: state.getFilteredStudents()
  }))
}
