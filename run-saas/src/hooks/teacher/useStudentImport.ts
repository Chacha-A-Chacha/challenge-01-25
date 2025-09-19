// hooks/teacher/useStudentImport.ts
import { useState, useCallback } from 'react'
import { useApiMutation } from '@/hooks/api'
import { useNotifications } from '@/hooks/ui'
import { validateImportFile, parseExcelFile } from '@/lib/utils'
import { bulkStudentImportSchema } from '@/lib/validations'
import type { StudentImportData, StudentImportResult } from '@/types'

/**
 * Excel import processing and validation
 */
export function useStudentImport() {
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { showSuccess, showError } = useNotifications()

  // Import students mutation
  const importMutation = useApiMutation(
    async ({ file, classId }: { file: File; classId: string }) => {
      // Parse Excel file
      setImportProgress(25)
      const rawData = await parseExcelFile(file)
      
      // Validate data
      setImportProgress(50)
      const validation = bulkStudentImportSchema.safeParse({
        students: rawData,
        classId
      })
      
      if (!validation.success) {
        const errors = validation.error.issues.map(issue => issue.message)
        setValidationErrors(errors)
        throw new Error('Validation failed: ' + errors.join(', '))
      }
      
      // Upload to server
      setImportProgress(75)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('classId', classId)
      
      const response = await fetch('/api/students/import', {
        method: 'POST',
        body: formData
      })
      
      setImportProgress(100)
      return await response.json()
    },
    {
      onSuccess: (result) => {
        setImportResult(result)
        showSuccess(
          'Import Completed',
          `Successfully imported ${result.imported} students`
        )
      },
      onError: (error) => {
        showError('Import Failed', error)
        setImportProgress(0)
      }
    }
  )

  // Validate file before upload
  const validateFile = useCallback((file: File): string | null => {
    const fileValidation = validateImportFile(file)
    return fileValidation?.message || null
  }, [])

  // Preview data from file
  const previewFile = useCallback(async (file: File): Promise<StudentImportData[]> => {
    try {
      const data = await parseExcelFile(file)
      return data.slice(0, 10) // Return first 10 rows for preview
    } catch (error) {
      throw new Error('Failed to preview file')
    }
  }, [])

  // Import students
  const importStudents = async (file: File, classId: string) => {
    // Reset state
    setImportProgress(0)
    setImportResult(null)
    setValidationErrors([])
    
    // Validate file
    const fileError = validateFile(file)
    if (fileError) {
      showError('Invalid File', fileError)
      return false
    }
    
    try {
      await importMutation.mutate({ file, classId })
      return true
    } catch (error) {
      return false
    }
  }

  // Generate credentials file for download
  const downloadCredentials = useCallback(() => {
    if (!importResult?.students) return

    const csvContent = [
      'Student Number,Name,Email,Phone Number,Authentication Methods',
      ...importResult.students.map(s => 
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
  }, [importResult])

  // Clear import state
  const clearImport = useCallback(() => {
    setImportProgress(0)
    setImportResult(null)
    setValidationErrors([])
  }, [])

  return {
    // State
    importProgress,
    importResult,
    validationErrors,
    isImporting: importMutation.isLoading,
    
    // Actions
    validateFile,
    previewFile,
    importStudents,
    downloadCredentials,
    clearImport
  }
}
