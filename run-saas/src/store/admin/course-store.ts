// store/admin/course-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  Course,
  CourseWithDetails,
  TeacherWithCourse,
  CourseStatus,
  TeacherRole,
  BaseStoreState,
  ApiResponse,
  CourseFormData,
  CourseUpdateData,
  CourseStats,
  PaginationState
} from '@/types'
import { 
  COURSE_STATUS,
  TEACHER_ROLES,
  USER_ROLES,
  PERMISSIONS,
  ERROR_MESSAGES,
  API_ROUTES,
  BUSINESS_RULES
} from '@/lib/constants'
import { 
  validateForm,
  createCourseSchema,
  updateCourseSchema,
  courseNameSchema,
  teacherEmailSchema 
} from '@/lib/validations'
import { 
  formatDate,
  createApiResponse,
  isValidEmail,
  sanitizeInput,
  generateTempPassword,
  hashPassword
} from '@/lib/utils'

// ============================================================================
// COURSE STORE INTERFACE
// ============================================================================

interface CourseState extends BaseStoreState {
  // Course data
  courses: CourseWithDetails[]
  selectedCourse: CourseWithDetails | null
  
  // Course creation state
  isCreating: boolean
  createError: string | null
  creationProgress: {
    step: 'validating' | 'creating_teacher' | 'creating_course' | 'complete'
    message: string
  } | null
  
  // Course management state
  isUpdating: boolean
  updateError: string | null
  isDeletingHeadTeacher: boolean
  deleteHeadTeacherError: string | null
  
  // Filtering and search
  searchQuery: string
  statusFilter: CourseStatus | 'all'
  sortBy: 'name' | 'createdAt' | 'status' | 'studentCount'
  sortOrder: 'asc' | 'desc'
  pagination: PaginationState
  
  // Statistics
  stats: CourseStats | null
  
  // Actions - Data Management
  loadCourses: () => Promise<void>
  refreshCourses: () => Promise<void>
  loadCourseStats: () => Promise<void>
  
  // Actions - Course Creation (Admin Only)
  createCourseWithHeadTeacher: (data: CourseFormData) => Promise<{
    success: boolean
    course?: CourseWithDetails
    teacher?: TeacherWithCourse
    error?: string
  }>
  validateCourseCreationData: (data: CourseFormData) => {
    isValid: boolean
    errors: Record<string, string>
  }
  
  // Actions - Course Management
  updateCourse: (courseId: string, updates: CourseUpdateData) => Promise<boolean>
  setCourseEndDate: (courseId: string, endDate: Date) => Promise<boolean>
  updateCourseStatus: (courseId: string, status: CourseStatus) => Promise<boolean>
  
  // Actions - Head Teacher Management  
  removeHeadTeacherAndDeactivate: (courseId: string, reason?: string) => Promise<boolean>
  changeHeadTeacher: (courseId: string, newTeacherEmail: string) => Promise<boolean>
  
  // Actions - Selection and Filtering
  selectCourse: (course: CourseWithDetails | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: CourseStatus | 'all') => void
  setSorting: (sortBy: CourseState['sortBy'], order: 'asc' | 'desc') => void
  
  // Actions - Pagination
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  
  // Getters - Data Access
  getCourseById: (id: string) => CourseWithDetails | undefined
  getActiveCourses: () => CourseWithDetails[]
  getInactiveCourses: () => CourseWithDetails[]
  getCoursesByStatus: (status: CourseStatus) => CourseWithDetails[]
  getFilteredCourses: () => CourseWithDetails[]
  getPaginatedCourses: () => CourseWithDetails[]
  
  // Getters - Statistics
  getTotalCourses: () => number
  getActiveCoursesCount: () => number
  getInactiveCoursesCount: () => number
  getTotalStudentsAcrossAllCourses: () => number
  getTotalTeachersAcrossAllCourses: () => number
  getAverageStudentsPerCourse: () => number
  
  // Getters - Business Logic
  canCreateCourse: () => boolean
  canRemoveHeadTeacher: (courseId: string) => boolean
  canUpdateCourse: (courseId: string) => boolean
  isCourseFull: (courseId: string) => boolean
  getCourseCapacityInfo: (courseId: string) => {
    totalCapacity: number
    usedCapacity: number
    availableCapacity: number
    utilizationRate: number
  }
  
  // Utility Actions
  exportCourseData: (courseId?: string) => any[]
  generateCourseReport: (courseId: string) => Promise<any>
  clearErrors: () => void
  resetFilters: () => void
  resetState: () => void
}

// ============================================================================
// COURSE STORE IMPLEMENTATION
// ============================================================================

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      courses: [],
      selectedCourse: null,
      
      isCreating: false,
      createError: null,
      creationProgress: null,
      
      isUpdating: false,
      updateError: null,
      isDeletingHeadTeacher: false,
      deleteHeadTeacherError: null,
      
      searchQuery: '',
      statusFilter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false
      },
      
      stats: null,
      
      // ============================================================================
      // DATA LOADING ACTIONS
      // ============================================================================
      
      loadCourses: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(API_ROUTES.COURSES, {
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const result: ApiResponse<CourseWithDetails[]> = await response.json()
          
          if (result.success && result.data) {
            set({ 
              courses: result.data,
              isLoading: false,
              lastUpdated: new Date(),
              pagination: {
                ...get().pagination,
                total: result.data.length
              }
            })
            
            // Load stats after courses are loaded
            get().loadCourseStats()
          } else {
            throw new Error(result.error || ERROR_MESSAGES.COURSE.LOAD_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.COURSE.LOAD_FAILED
          set({ 
            error: errorMessage,
            isLoading: false
          })
          console.error('Failed to load courses:', error)
        }
      },
      
      refreshCourses: async () => {
        // Refresh without showing loading state
        const currentState = get()
        await currentState.loadCourses()
      },
      
      loadCourseStats: async () => {
        try {
          const response = await fetch(API_ROUTES.COURSE_STATS)
          
          if (response.ok) {
            const result: ApiResponse<CourseStats> = await response.json()
            
            if (result.success && result.data) {
              set({ stats: result.data })
            }
          }
        } catch (error) {
          console.error('Failed to load course stats:', error)
          // Don't update error state for stats failure
        }
      },
      
      // ============================================================================
      // COURSE CREATION ACTIONS
      // ============================================================================
      
      validateCourseCreationData: (data) => {
        const errors: Record<string, string> = {}
        
        // Validate course name
        const nameValidation = validateForm(courseNameSchema, { name: data.courseName })
        if (!nameValidation.isValid) {
          errors.courseName = 'Course name must be 2-100 characters long'
        }
        
        // Check for duplicate course name
        const existingCourse = get().courses.find(
          course => course.name.toLowerCase() === data.courseName.toLowerCase()
        )
        if (existingCourse) {
          errors.courseName = ERROR_MESSAGES.COURSE.DUPLICATE_NAME
        }
        
        // Validate teacher email
        const emailValidation = validateForm(teacherEmailSchema, { email: data.headTeacherEmail })
        if (!emailValidation.isValid) {
          errors.headTeacherEmail = 'Please enter a valid email address'
        }
        
        // Check for duplicate teacher email
        const allTeachers = get().courses.flatMap(course => [
          course.headTeacher,
          ...course.teachers
        ])
        const existingTeacher = allTeachers.find(
          teacher => teacher.email.toLowerCase() === data.headTeacherEmail.toLowerCase()
        )
        if (existingTeacher) {
          errors.headTeacherEmail = ERROR_MESSAGES.TEACHER.EMAIL_ALREADY_EXISTS
        }
        
        // Validate password if provided
        if (data.temporaryPassword && data.temporaryPassword.length < 8) {
          errors.temporaryPassword = 'Password must be at least 8 characters long'
        }
        
        return {
          isValid: Object.keys(errors).length === 0,
          errors
        }
      },
      
      createCourseWithHeadTeacher: async (data) => {
        set({ 
          isCreating: true, 
          createError: null,
          creationProgress: {
            step: 'validating',
            message: 'Validating course data...'
          }
        })
        
        try {
          // Validate input data
          const validation = get().validateCourseCreationData(data)
          if (!validation.isValid) {
            const firstError = Object.values(validation.errors)[0]
            throw new Error(firstError)
          }
          
          // Sanitize inputs
          const sanitizedData = {
            courseName: sanitizeInput(data.courseName),
            headTeacherEmail: sanitizeInput(data.headTeacherEmail).toLowerCase(),
            temporaryPassword: data.temporaryPassword || generateTempPassword()
          }
          
          set({
            creationProgress: {
              step: 'creating_teacher',
              message: 'Creating head teacher account...'
            }
          })
          
          // Create course with head teacher (atomic operation)
          const createPayload = {
            courseName: sanitizedData.courseName,
            headTeacherEmail: sanitizedData.headTeacherEmail,
            temporaryPassword: sanitizedData.temporaryPassword
          }
          
          set({
            creationProgress: {
              step: 'creating_course',
              message: 'Creating course and linking teacher...'
            }
          })
          
          const response = await fetch(API_ROUTES.COURSES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
          }
          
          const result: ApiResponse<{
            course: CourseWithDetails
            teacher: TeacherWithCourse
          }> = await response.json()
          
          if (result.success && result.data) {
            const { course, teacher } = result.data
            
            set({
              creationProgress: {
                step: 'complete',
                message: 'Course created successfully!'
              }
            })
            
            // Add new course to store
            set((state) => ({
              courses: [course, ...state.courses],
              selectedCourse: course,
              isCreating: false,
              creationProgress: null,
              lastUpdated: new Date(),
              pagination: {
                ...state.pagination,
                total: state.pagination.total + 1
              }
            }))
            
            // Refresh stats
            get().loadCourseStats()
            
            return {
              success: true,
              course,
              teacher
            }
          } else {
            throw new Error(result.error || ERROR_MESSAGES.COURSE.CREATE_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.COURSE.CREATE_FAILED
          
          set({ 
            createError: errorMessage,
            isCreating: false,
            creationProgress: null
          })
          
          console.error('Failed to create course:', error)
          
          return {
            success: false,
            error: errorMessage
          }
        }
      },
      
      // ============================================================================
      // COURSE MANAGEMENT ACTIONS
      // ============================================================================
      
      updateCourse: async (courseId, updates) => {
        set({ isUpdating: true, updateError: null })
        
        try {
          // Validate updates
          const validation = validateForm(updateCourseSchema, updates)
          if (!validation.isValid || !validation.data) {
            throw new Error('Invalid course update data')
          }
          
          const response = await fetch(API_ROUTES.COURSE_BY_ID(courseId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validation.data)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }
          
          const result: ApiResponse<CourseWithDetails> = await response.json()
          
          if (result.success && result.data) {
            // Update course in store
            set((state) => ({
              courses: state.courses.map(course =>
                course.id === courseId ? result.data! : course
              ),
              selectedCourse: state.selectedCourse?.id === courseId 
                ? result.data 
                : state.selectedCourse,
              isUpdating: false,
              lastUpdated: new Date()
            }))
            
            return true
          } else {
            throw new Error(result.error || ERROR_MESSAGES.COURSE.UPDATE_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.COURSE.UPDATE_FAILED
          
          set({ 
            updateError: errorMessage,
            isUpdating: false
          })
          
          console.error('Failed to update course:', error)
          return false
        }
      },
      
      setCourseEndDate: async (courseId, endDate) => {
        return get().updateCourse(courseId, { endDate })
      },
      
      updateCourseStatus: async (courseId, status) => {
        return get().updateCourse(courseId, { status })
      },
      
      removeHeadTeacherAndDeactivate: async (courseId, reason) => {
        set({ isDeletingHeadTeacher: true, deleteHeadTeacherError: null })
        
        try {
          const course = get().getCourseById(courseId)
          if (!course) {
            throw new Error(ERROR_MESSAGES.COURSE.NOT_FOUND)
          }
          
          if (course.status === COURSE_STATUS.INACTIVE) {
            throw new Error(ERROR_MESSAGES.COURSE.ALREADY_INACTIVE)
          }
          
          const payload = reason ? { reason } : {}
          
          const response = await fetch(API_ROUTES.REMOVE_HEAD_TEACHER(courseId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }
          
          const result: ApiResponse<void> = await response.json()
          
          if (result.success) {
            // Update course status in store
            set((state) => ({
              courses: state.courses.map(c =>
                c.id === courseId 
                  ? { 
                      ...c, 
                      status: COURSE_STATUS.INACTIVE as CourseStatus,
                      endDate: new Date()
                    }
                  : c
              ),
              selectedCourse: state.selectedCourse?.id === courseId 
                ? { 
                    ...state.selectedCourse, 
                    status: COURSE_STATUS.INACTIVE as CourseStatus,
                    endDate: new Date()
                  }
                : state.selectedCourse,
              isDeletingHeadTeacher: false,
              lastUpdated: new Date()
            }))
            
            // Refresh stats
            get().loadCourseStats()
            
            return true
          } else {
            throw new Error(result.error || ERROR_MESSAGES.TEACHER.REMOVE_HEAD_TEACHER_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.TEACHER.REMOVE_HEAD_TEACHER_FAILED
          
          set({ 
            deleteHeadTeacherError: errorMessage,
            isDeletingHeadTeacher: false
          })
          
          console.error('Failed to remove head teacher:', error)
          return false
        }
      },
      
      changeHeadTeacher: async (courseId, newTeacherEmail) => {
        set({ isUpdating: true, updateError: null })
        
        try {
          if (!isValidEmail(newTeacherEmail)) {
            throw new Error('Invalid email address')
          }
          
          const response = await fetch(API_ROUTES.CHANGE_HEAD_TEACHER(courseId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newHeadTeacherEmail: newTeacherEmail.toLowerCase().trim() 
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }
          
          const result: ApiResponse<CourseWithDetails> = await response.json()
          
          if (result.success && result.data) {
            // Update course in store
            set((state) => ({
              courses: state.courses.map(course =>
                course.id === courseId ? result.data! : course
              ),
              selectedCourse: state.selectedCourse?.id === courseId 
                ? result.data 
                : state.selectedCourse,
              isUpdating: false,
              lastUpdated: new Date()
            }))
            
            return true
          } else {
            throw new Error(result.error || ERROR_MESSAGES.TEACHER.CHANGE_HEAD_TEACHER_FAILED)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.TEACHER.CHANGE_HEAD_TEACHER_FAILED
          
          set({ 
            updateError: errorMessage,
            isUpdating: false
          })
          
          console.error('Failed to change head teacher:', error)
          return false
        }
      },
      
      // ============================================================================
      // SELECTION AND FILTERING ACTIONS
      // ============================================================================
      
      selectCourse: (course) => {
        set({ selectedCourse: course })
      },
      
      setSearchQuery: (query) => {
        set({ 
          searchQuery: query,
          pagination: { ...get().pagination, page: 1 }
        })
      },
      
      setStatusFilter: (status) => {
        set({ 
          statusFilter: status,
          pagination: { ...get().pagination, page: 1 }
        })
      },
      
      setSorting: (sortBy, order) => {
        set({ 
          sortBy,
          sortOrder: order,
          pagination: { ...get().pagination, page: 1 }
        })
      },
      
      setPage: (page) => {
        set((state) => ({
          pagination: { ...state.pagination, page }
        }))
      },
      
      setPageSize: (size) => {
        set((state) => ({
          pagination: { ...state.pagination, limit: size, page: 1 }
        }))
      },
      
      // ============================================================================
      // GETTER FUNCTIONS
      // ============================================================================
      
      getCourseById: (id) => {
        return get().courses.find(course => course.id === id)
      },
      
      getActiveCourses: () => {
        return get().courses.filter(course => course.status === COURSE_STATUS.ACTIVE)
      },
      
      getInactiveCourses: () => {
        return get().courses.filter(course => course.status === COURSE_STATUS.INACTIVE)
      },
      
      getCoursesByStatus: (status) => {
        return get().courses.filter(course => course.status === status)
      },
      
      getFilteredCourses: () => {
        const { courses, searchQuery, statusFilter, sortBy, sortOrder } = get()
        
        let filtered = courses
        
        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(course =>
            course.name.toLowerCase().includes(query) ||
            course.headTeacher.email.toLowerCase().includes(query)
          )
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
          filtered = filtered.filter(course => course.status === statusFilter)
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
          let comparison = 0
          
          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name)
              break
            case 'createdAt':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              break
            case 'status':
              comparison = a.status.localeCompare(b.status)
              break
            case 'studentCount':
              const aCount = a.classes.reduce((sum, cls) => sum + cls.students.length, 0)
              const bCount = b.classes.reduce((sum, cls) => sum + cls.students.length, 0)
              comparison = aCount - bCount
              break
          }
          
          return sortOrder === 'asc' ? comparison : -comparison
        })
        
        return filtered
      },
      
      getPaginatedCourses: () => {
        const { pagination } = get()
        const filtered = get().getFilteredCourses()
        
        const startIndex = (pagination.page - 1) * pagination.limit
        const endIndex = startIndex + pagination.limit
        
        // Update pagination state
        set((state) => ({
          pagination: {
            ...state.pagination,
            total: filtered.length,
            hasMore: endIndex < filtered.length
          }
        }))
        
        return filtered.slice(startIndex, endIndex)
      },
      
      // Statistics getters
      getTotalCourses: () => get().courses.length,
      
      getActiveCoursesCount: () => get().getActiveCourses().length,
      
      getInactiveCoursesCount: () => get().getInactiveCourses().length,
      
      getTotalStudentsAcrossAllCourses: () => {
        return get().courses.reduce((total, course) => {
          return total + course.classes.reduce((classTotal, cls) => {
            return classTotal + cls.students.length
          }, 0)
        }, 0)
      },
      
      getTotalTeachersAcrossAllCourses: () => {
        return get().courses.reduce((total, course) => {
          return total + 1 + course.teachers.length // Head teacher + additional teachers
        }, 0)
      },
      
      getAverageStudentsPerCourse: () => {
        const totalCourses = get().getTotalCourses()
        const totalStudents = get().getTotalStudentsAcrossAllCourses()
        return totalCourses > 0 ? Math.round(totalStudents / totalCourses) : 0
      },
      
      // Business logic getters
      canCreateCourse: () => {
        // Add business logic for course creation limits if any
        return true
      },
      
      canRemoveHeadTeacher: (courseId) => {
        const course = get().getCourseById(courseId)
        return course?.status === COURSE_STATUS.ACTIVE
      },
      
      canUpdateCourse: (courseId) => {
        const course = get().getCourseById(courseId)
        return course?.status === COURSE_STATUS.ACTIVE
      },
      
      isCourseFull: (courseId) => {
        const course = get().getCourseById(courseId)
        if (!course) return false
        
        const totalCapacity = course.classes.reduce((sum, cls) => sum + cls.capacity, 0)
        const totalStudents = course.classes.reduce((sum, cls) => sum + cls.students.length, 0)
        
        return totalStudents >= totalCapacity
      },
      
      getCourseCapacityInfo: (courseId) => {
        const course = get().getCourseById(courseId)
        
        if (!course) {
          return {
            totalCapacity: 0,
            usedCapacity: 0,
            availableCapacity: 0,
            utilizationRate: 0
          }
        }
        
        const totalCapacity = course.classes.reduce((sum, cls) => sum + cls.capacity, 0)
        const usedCapacity = course.classes.reduce((sum, cls) => sum + cls.students.length, 0)
        const availableCapacity = totalCapacity - usedCapacity
        const utilizationRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0
        
        return {
          totalCapacity,
          usedCapacity,
          availableCapacity,
          utilizationRate
        }
      },
      
      // ============================================================================
      // UTILITY ACTIONS
      // ============================================================================
      
      exportCourseData: (courseId) => {
        const courses = courseId ? [get().getCourseById(courseId)].filter(Boolean) : get().courses
        
        return courses.map(course => ({
          id: course.id,
          name: course.name,
          status: course.status,
          headTeacher: course.headTeacher.email,
          additionalTeachers: course.teachers.length,
          totalClasses: course.classes.length,
          totalStudents: course.classes.reduce((sum, cls) => sum + cls.students.length, 0),
          totalCapacity: course.classes.reduce((sum, cls) => sum + cls.capacity, 0),
          createdAt: formatDate(course.createdAt),
          endDate: course.endDate ? formatDate(course.endDate) : null
        }))
      },
      
      generateCourseReport: async (courseId) => {
        const course = get().getCourseById(courseId)
        if (!course) {
          throw new Error(ERROR_MESSAGES.COURSE.NOT_FOUND)
        }
        
        // Generate comprehensive course report
        return {
          course: {
            id: course.id,
            name: course.name,
            status: course.status,
            createdAt: course.createdAt,
            endDate: course.endDate
          },
          teachers: {
            headTeacher: course.headTeacher,
            additionalTeachers: course.teachers,
            total: 1 + course.teachers.length
          },
          classes: course.classes.map(cls => ({
            id: cls.id,
            name: cls.name,
            capacity: cls.capacity,
            studentsCount: cls.students.length,
            sessionsCount: cls.sessions.length,
            utilizationRate: cls.capacity > 0 ? Math.round((cls.students.length / cls.capacity) * 100) : 0
          })),
          statistics: get().getCourseCapacityInfo(courseId),
          generatedAt: new Date().toISOString()
        }
      },
      
      clearErrors: () => {
        set({ 
          error: null,
          createError: null,
          updateError: null,
          deleteHeadTeacherError: null
        })
      },
      
      resetFilters: () => {
        set({
          searchQuery: '',
          statusFilter: 'all',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            hasMore: false
          }
        })
      },
      
      resetState: () => {
        set({
          courses: [],
          selectedCourse: null,
          isCreating: false,
          createError: null,
          creationProgress: null,
          isUpdating: false,
          updateError: null,
          isDeletingHeadTeacher: false,
          deleteHeadTeacherError: null,
          searchQuery: '',
          statusFilter: 'all',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            hasMore: false
          },
          stats: null,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'course-storage',
      partialize: (state) => ({
        // Only persist essential data, not loading states
        selectedCourse: state.selectedCourse,
        searchQuery: state.searchQuery,
        statusFilter: state.statusFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        pagination: state.pagination
      })
    }
  )
)
