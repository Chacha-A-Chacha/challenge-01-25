// store/teacher/student-store.ts
import { create } from 'zustand'
import type { 
  Student, 
  StudentImportData, 
  StudentImportResult,
  EntityStoreState,
  ApiResponse 
} from '@/types'

interface StudentState extends EntityStoreState<Student> {
  // Student data
  students: Student[]
  selectedStudent: Student | null
  
  // Import state
  isImporting: boolean
  importProgress: number
  importError: string | null
  importResult: StudentImportResult | null
  
  // Assignment state
  isAutoAssigning: boolean
  assignmentError: string | null
  
  // Actions - Student management
  loadStudents: (classId?: string) => Promise<void>
  updateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>
  deleteStudent: (id: string) => Promise<boolean>
  
  // Actions - Import
  importStudents: (file: File, classId: string) => Promise<boolean>
  parseExcelFile: (file: File) => Promise<StudentImportData[]>
  validateImportData: (data: StudentImportData[]) => { valid: StudentImportData[]; errors: string[] }
  clearImportResult: () => void
  
  // Actions - Auto assignment
  autoAssignStudents: (classId: string) => Promise<boolean>
  reassignStudent: (studentId: string, saturdaySessionId: string, sundaySessionId: string) => Promise<boolean>
  
  // Selection and filtering
  selectStudent: (student: Student | null) => void
  searchStudents: (query: string) => void
  filterByClass: (classId: string | 'all') => void
  
  // Getters
  getStudentById: (id: string) => Student | undefined
  getStudentsByClass: (classId: string) => Student[]
  getUnassignedStudents: () => Student[]
  getStudentStats: () => {
    total: number
    assigned: number
    unassigned: number
    byClass: Record<string, number>
  }
  
  // Utility
  generateStudentCredentialsFile: (students: Student[]) => void
  exportStudentData: (classId?: string) => any[]
}

export const useStudentStore = create<StudentState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  items: [],
  students: [],
  selectedItem: null,
  selectedStudent: null,
  searchQuery: '',
  filters: { classId: 'all' },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: false
  },
  
  isImporting: false,
  importProgress: 0,
  importError: null,
  importResult: null,
  
  isAutoAssigning: false,
  assignmentError: null,
  
  // Load students
  loadStudents: async (classId) => {
    set({ isLoading: true, error: null })
    
    try {
      const url = classId ? `/api/students?classId=${classId}` : '/api/students'
      const response = await fetch(url)
      const data: ApiResponse<Student[]> = await response.json()
      
      if (data.success && data.data) {
        set({ 
          students: data.data,
          items: data.data,
          isLoading: false,
          lastUpdated: new Date(),
          pagination: {
            ...get().pagination,
            total: data.data.length
          }
        })
      } else {
        throw new Error(data.error || 'Failed to load students')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },
  
  // Update student
  updateStudent: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result: ApiResponse<Student> = await response.json()
      
      if (result.success && result.data) {
        set((state) => ({
          students: state.students.map(student => 
            student.id === id ? { ...student, ...result.data } : student
          ),
          items: state.items.map(student => 
            student.id === id ? { ...student, ...result.data } : student
          ),
          selectedStudent: state.selectedStudent?.id === id 
            ? { ...state.selectedStudent, ...result.data } 
            : state.selectedStudent,
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to update student')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Delete student
  deleteStudent: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE'
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set((state) => ({
          students: state.students.filter(student => student.id !== id),
          items: state.items.filter(student => student.id !== id),
          selectedStudent: state.selectedStudent?.id === id ? null : state.selectedStudent,
          isLoading: false,
          lastUpdated: new Date()
        }))
        return true
      } else {
        throw new Error(result.error || 'Failed to delete student')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
      return false
    }
  },
  
  // Parse Excel file
  parseExcelFile: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const { default: XLSX } = await import('xlsx')
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          const studentData: StudentImportData[] = jsonData.map((row: any) => ({
            student_number: row.student_number || row['Student Number'] || '',
            first_name: row.first_name || row['First Name'] || '',
            last_name: row.last_name || row['Last Name'] || '',
            email: row.email || row['Email'] || '',
            phone_number: row.phone_number || row['Phone Number'] || ''
          }))
          
          resolve(studentData)
        } catch (error) {
          reject(new Error('Failed to parse Excel file'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  },
  
  // Validate import data
  validateImportData: (data) => {
    const valid: StudentImportData[] = []
    const errors: string[] = []
    
    data.forEach((row, index) => {
      const rowNum = index + 1
      
      // Required fields validation
      if (!row.student_number) {
        errors.push(`Row ${rowNum}: Student number is required`)
        return
      }
      
      if (!row.first_name) {
        errors.push(`Row ${rowNum}: First name is required`)
        return
      }
      
      if (!row.email) {
        errors.push(`Row ${rowNum}: Email is required`)
        return
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`)
        return
      }
      
      // Phone number validation (if provided)
      if (row.phone_number) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
        if (!phoneRegex.test(row.phone_number.replace(/\s/g, ''))) {
          errors.push(`Row ${rowNum}: Invalid phone number format`)
          return
        }
      }
      
      valid.push(row)
    })
    
    return { valid, errors }
  },
  
  // Import students
  importStudents: async (file, classId) => {
    set({ isImporting: true, importProgress: 0, importError: null })
    
    try {
      // Parse file
      set({ importProgress: 25 })
      const rawData = await get().parseExcelFile(file)
      
      // Validate data
      set({ importProgress: 50 })
      const { valid, errors } = get().validateImportData(rawData)
      
      if (errors.length > 0 && valid.length === 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`)
      }
      
      // Import students
      set({ importProgress: 75 })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('classId', classId)
      
      const response = await fetch('/api/students/import', {
        method: 'POST',
        body: formData
      })
      
      const result: ApiResponse<StudentImportResult> = await response.json()
      
      if (result.success && result.data) {
        set({ 
          importResult: result.data,
          importProgress: 100,
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
      set({ 
        importError: error instanceof Error ? error.message : 'Unknown error',
        isImporting: false,
        importProgress: 0
      })
      return false
    }
  },
  
  clearImportResult: () => set({ 
    importResult: null, 
    importError: null, 
    importProgress: 0 
  }),
  
  // Auto assign students to sessions
  autoAssignStudents: async (classId) => {
    set({ isAutoAssigning: true, assignmentError: null })
    
    try {
      const response = await fetch('/api/students/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set({ isAutoAssigning: false, lastUpdated: new Date() })
        // Reload students to get updated assignments
        await get().loadStudents(classId)
        return true
      } else {
        throw new Error(result.error || 'Auto-assignment failed')
      }
    } catch (error) {
      set({ 
        assignmentError: error instanceof Error ? error.message : 'Unknown error',
        isAutoAssigning: false
      })
      return false
    }
  },
  
  // Reassign student to different sessions
  reassignStudent: async (studentId, saturdaySessionId, sundaySessionId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/students/${studentId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saturdaySessionId, sundaySessionId })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        set({ isLoading: false, lastUpdated: new Date() })
        // Reload students to get updated assignments
        const student = get().getStudentById(studentId)
        if (student) {
          await get().loadStudents(student.classId)
        }
        return true
      } else {
        throw new Error(result.error || 'Reassignment failed')
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
  selectStudent: (student) => set({ 
    selectedStudent: student,
    selectedItem: student
  }),
  
  searchStudents: (query) => {
    set({ searchQuery: query })
    
    let filtered = get().students
    
    if (query) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(student =>
        student.studentNumber.toLowerCase().includes(lowerQuery) ||
        student.firstName.toLowerCase().includes(lowerQuery) ||
        (student.lastName && student.lastName.toLowerCase().includes(lowerQuery)) ||
        student.email.toLowerCase().includes(lowerQuery)
      )
    }
    
    // Apply class filter if set
    if (get().filters.classId !== 'all') {
      filtered = filtered.filter(student => student.classId === get().filters.classId)
    }
    
    set({ items: filtered })
  },
  
  filterByClass: (classId) => {
    const filters = { ...get().filters, classId }
    set({ filters })
    
    let filtered = get().students
    
    if (classId !== 'all') {
      filtered = filtered.filter(student => student.classId === classId)
    }
    
    // Apply search if exists
    if (get().searchQuery) {
      const lowerQuery = get().searchQuery.toLowerCase()
      filtered = filtered.filter(student =>
        student.studentNumber.toLowerCase().includes(lowerQuery) ||
        student.firstName.toLowerCase().includes(lowerQuery) ||
        (student.lastName && student.lastName.toLowerCase().includes(lowerQuery)) ||
        student.email.toLowerCase().includes(lowerQuery)
      )
    }
    
    set({ items: filtered })
  },
  
  // Getters
  getStudentById: (id) => get().students.find(s => s.id === id),
  getStudentsByClass: (classId) => get().students.filter(s => s.classId === classId),
  getUnassignedStudents: () => get().students.filter(s => !s.sessions || s.sessions.length < 2),
  
  getStudentStats: () => {
    const students = get().students
    const assigned = students.filter(s => s.sessions && s.sessions.length >= 2).length
    const byClass: Record<string, number> = {}
    
    students.forEach(student => {
      byClass[student.classId] = (byClass[student.classId] || 0) + 1
    })
    
    return {
      total: students.length,
      assigned,
      unassigned: students.length - assigned,
      byClass
    }
  },
  
  // Generate credentials file for students
  generateStudentCredentialsFile: (students) => {
    const csvContent = [
      'Student Number,Name,Email,Phone Number,Authentication Methods',
      ...students.map(s => 
        `${s.studentNumber},"${s.firstName} ${s.lastName || ''}",${s.email || 'N/A'},${s.phoneNumber || 'N/A'},"Student Number + Phone/Email/Name"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student-credentials-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  },
  
  // Export student data
  exportStudentData: (classId) => {
    const students = classId ? get().getStudentsByClass(classId) : get().students
    
    return students.map(student => ({
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName || '',
      email: student.email,
      phoneNumber: student.phoneNumber || '',
      class: student.class?.name || '',
      saturdaySession: student.sessions?.find(s => s.day === 'SATURDAY')?.startTime + '-' + student.sessions?.find(s => s.day === 'SATURDAY')?.endTime || 'Not assigned',
      sundaySession: student.sessions?.find(s => s.day === 'SUNDAY')?.startTime + '-' + student.sessions?.find(s => s.day === 'SUNDAY')?.endTime || 'Not assigned'
    }))
  }
}))

// Selectors for performance
export const useStudents = () => useStudentStore(state => state.students)
export const useSelectedStudent = () => useStudentStore(state => state.selectedStudent)
export const useStudentStats = () => useStudentStore(state => state.getStudentStats())
export const useStudentImport = () => useStudentStore(state => ({
  isImporting: state.isImporting,
  progress: state.importProgress,
  error: state.importError,
  result: state.importResult,
  importStudents: state.importStudents,
  clearResult: state.clearImportResult
}))
export const useStudentAssignment = () => useStudentStore(state => ({
  isAutoAssigning: state.isAutoAssigning,
  error: state.assignmentError,
  autoAssign: state.autoAssignStudents,
  reassign: state.reassignStudent
}))
