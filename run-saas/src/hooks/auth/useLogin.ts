// hooks/auth/useLogin.ts
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { validateForm, adminTeacherLoginSchema, studentLoginSchema } from '@/lib/validations'
import { useUIStore } from '@/store'
import type { AdminTeacherLogin, StudentLogin } from '@/lib/validations'

/**
 * Handle login for both admin/teacher and student authentication
 */
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const { showSuccess, showError } = useUIStore()

  // Admin/Teacher login with email + password
  const loginAdminTeacher = async (credentials: AdminTeacherLogin) => {
    setIsLoading(true)
    setErrors({})

    try {
      // Validate credentials format
      const { isValid, errors: validationErrors } = validateForm(adminTeacherLoginSchema, credentials)
      
      if (!isValid) {
        setErrors(validationErrors)
        return false
      }

      const result = await signIn('admin-teacher', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      })

      if (result?.error) {
        showError('Login Failed', 'Invalid email or password')
        return false
      }

      showSuccess('Welcome!', 'Successfully logged in')
      
      // Redirect based on role will be handled by middleware
      router.refresh()
      return true

    } catch (error) {
      showError('Login Error', 'An unexpected error occurred')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Student login with multiple authentication methods
  const loginStudent = async (credentials: StudentLogin) => {
    setIsLoading(true)
    setErrors({})

    try {
      // Validate credentials format
      const { isValid, errors: validationErrors } = validateForm(studentLoginSchema, credentials)
      
      if (!isValid) {
        setErrors(validationErrors)
        return false
      }

      const result = await signIn('student', {
        studentNumber: credentials.studentNumber,
        phoneNumber: credentials.phoneNumber,
        email: credentials.email,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        redirect: false
      })

      if (result?.error) {
        showError('Login Failed', 'Invalid credentials. Please check your information.')
        return false
      }

      showSuccess('Welcome!', 'Successfully logged in')
      router.push('/student')
      return true

    } catch (error) {
      showError('Login Error', 'An unexpected error occurred')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // State
    isLoading,
    errors,
    
    // Actions
    loginAdminTeacher,
    loginStudent,
    clearErrors: () => setErrors({})
  }
}
