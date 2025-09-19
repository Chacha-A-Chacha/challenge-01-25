// store/admin/course-store.ts
import { create } from 'zustand'
import type { 
  Course, 
  Teacher, 
  CourseFormData, 
  CourseStatus,
  EntityStoreState,
  ApiResponse 
} from '@/types'

interface CourseState extends EntityStoreState<Course> {
  // Course management
  courses: Course[]
  selectedCourse: Course | null
  
  // Form state
  isCreatingCourse: boolean
  createError: string | null
  
  // Actions
  loadCourses: () => Promise<void>
  createCourse: (data: CourseFormData) => Promise<boolean>
  updateCourse: (id: string, updates: Partial<Course>) => Promise<boolean>
  deleteCourse: (id: string) => Promise<boolean>
  setCourseStatus: (id: string, status: CourseStatus) => Promise<boolean>
  setCourseEndDate: (id: string, endDate: Date) => Promise<boolean>
  removeHeadTeacher: (courseId: string) => Promise<boolean>
  
  // Selection and filtering
  selectCourse: (course: Course | null) => void
  searchCourses: (query: string) => void
  filterByStatus: (status: CourseStatus | 'all') => void
  
  // Getters
  getActiveCourses: () => Course[]
  getInactiveCourses: () => Course[]
  getCourseById: (id: string) => Course | undefined
  getCourseStats: () => {
    total: number
    active: number
    inactive: number
    completed: number
  }
}

export const useCourseStore = create<CourseState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  items: [],
  courses: [],
  selectedItem: null,
  selectedCourse: null,
  searchQuery: '',
  filters: { status: 'all' },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  },
  
  isCreatingCourse: false,
  createError: null,
  
  // Load courses from API
  loadCourses: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/courses')
      const data: ApiResponse<Course[]> = await response.json()
      
      if (data.success && data.data) {
        set({ 
          courses: data.data,
          items: data.data,
          isLoading: false,
          lastUpdated: new Date(),
          pagination: {
            ...get().pagination,
            total: data.data.length
          }
        })
      } else {
        throw new Error(data.error || 'Failed to load courses')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Create new course with head teacher
  createCourse: async (data) => {
    set({ isCreatingCourse: true, createError: null })
    
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result: ApiResponse<Course> = await response.json()
      
      if (result.success && result.data) {
        // Add new course to state
        set((state) => ({
          courses: [...state.courses, result.data!],
          items: [...state.items, result.data!],
          isCreatingCourse: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to create course')
      }
    } catch (error) {
      set({ 
        createError: error instanceof Error ? error.message : 'Unknown error',
        isCreatingCourse: false
      })
      return false
    }
  },
  
  // Update course
  updateCourse: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result: ApiResponse<Course> = await response.json()
      
      if (result.success && result.data) {
        set((state) => ({
          courses: state.courses.map(course => 
            course.id === id ? { ...course, ...result.data } : course
          ),
          items: state.items.map(course => 
            course.id === id ? { ...course, ...result.data } : course
          ),
          selectedCourse: state.selectedCourse?.id === id 
            ? { ...state.selectedCourse, ...result.data } 
            : state.selectedCourse,
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to update course')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Delete course (admin only)
  deleteCourse: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE'
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set((state) => ({
          courses: state.courses.filter(course => course.id !== id),
          items: state.items.filter(course => course.id !== id),
          selectedCourse: state.selectedCourse?.id === id ? null : state.selectedCourse,
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to delete course')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Set course status
  setCourseStatus: async (id, status) => {
    return get().updateCourse(id, { status })
  },
  
  // Set course end date
  setCourseEndDate: async (id, endDate) => {
    return get().updateCourse(id, { endDate })
  },
  
  // Remove head teacher (deactivates course)
  removeHeadTeacher: async (courseId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/courses/${courseId}/remove-head-teacher`, {
        method: 'POST'
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        // Update course status to inactive
        await get().setCourseStatus(courseId, CourseStatus.INACTIVE)
        return true
      } else {
        throw new Error(result.error || 'Failed to remove head teacher')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Selection and filtering
  selectCourse: (course) => set({ 
    selectedCourse: course,
    selectedItem: course
  }),
  
  searchCourses: (query) => {
    set({ searchQuery: query })
    
    // Filter courses based on search query
    const filtered = get().courses.filter(course =>
      course.name.toLowerCase().includes(query.toLowerCase()) ||
      course.headTeacher?.email.toLowerCase().includes(query.toLowerCase())
    )
    
    set({ items: filtered })
  },
  
  filterByStatus: (status) => {
    const filters = { ...get().filters, status }
    set({ filters })
    
    // Apply filter
    let filtered = get().courses
    
    if (status !== 'all') {
      filtered = filtered.filter(course => course.status === status)
    }
    
    // Also apply search if exists
    if (get().searchQuery) {
      const query = get().searchQuery.toLowerCase()
      filtered = filtered.filter(course =>
        course.name.toLowerCase().includes(query) ||
        course.headTeacher?.email.toLowerCase().includes(query)
      )
    }
    
    set({ items: filtered })
  },
  
  // Getters
  getActiveCourses: () => get().courses.filter(c => c.status === CourseStatus.ACTIVE),
  getInactiveCourses: () => get().courses.filter(c => c.status === CourseStatus.INACTIVE),
  getCourseById: (id) => get().courses.find(c => c.id === id),
  
  getCourseStats: () => {
    const courses = get().courses
    return {
      total: courses.length,
      active: courses.filter(c => c.status === CourseStatus.ACTIVE).length,
      inactive: courses.filter(c => c.status === CourseStatus.INACTIVE).length,
      completed: courses.filter(c => c.status === CourseStatus.COMPLETED).length
    }
  }
}))

// Selectors for performance
export const useCourses = () => useCourseStore(state => state.courses)
export const useSelectedCourse = () => useCourseStore(state => state.selectedCourse)
export const useCourseStats = () => useCourseStore(state => state.getCourseStats())
export const useActiveCourses = () => useCourseStore(state => state.getActiveCourses())
export const useCourseCreation = () => useCourseStore(state => ({
  isCreating: state.isCreatingCourse,
  error: state.createError,
  createCourse: state.createCourse
}))
