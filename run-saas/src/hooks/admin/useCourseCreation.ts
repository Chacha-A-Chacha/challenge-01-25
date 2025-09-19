// hooks/admin/useCourseCreation.ts
import { useState } from 'react'
import { useForm } from '@/hooks/ui'
import { useCourses } from './useCourses'
import { createCourseSchema } from '@/lib/validations'
import type { CreateCourse } from '@/lib/validations'

/**
 * Course + head teacher creation flow
 */
export function useCourseCreation() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { createCourse, isCreating } = useCourses()

  const form = useForm<CreateCourse>({
    validationSchema: createCourseSchema,
    validateOnBlur: true,
    onSubmit: async (data) => {
      const success = await createCourse(data)
      if (success) {
        setIsModalOpen(false)
        form.reset()
      }
    }
  })

  const openCreationModal = () => {
    setIsModalOpen(true)
    form.reset()
  }

  const closeCreationModal = () => {
    setIsModalOpen(false)
    form.reset()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.handleSubmit()
  }

  return {
    // Modal state
    isModalOpen,
    openCreationModal,
    closeCreationModal,
    
    // Form state
    form,
    isSubmitting: isCreating || form.isSubmitting,
    
    // Actions
    handleSubmit,
    
    // Validation helpers
    getCourseName: () => form.getFieldProps('courseName'),
    getHeadTeacherEmail: () => form.getFieldProps('headTeacherEmail'),
    getHeadTeacherPassword: () => form.getFieldProps('headTeacherPassword')
  }
}
