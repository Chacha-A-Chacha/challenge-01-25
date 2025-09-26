// hooks/ui/useForm.ts
import { useState, useCallback } from 'react'
import { validateForm } from '@/lib/validations'
import type { ZodType } from 'zod'

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues?: Partial<T>
  // Use precise Zod type (no deprecated ZodTypeAny, no 'any' generics)
  validationSchema?: ZodType<T>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  onSubmit?: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

interface TextFieldProps {
  name: string
  value: string | number | readonly string[]
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onBlur: () => void
  error?: string
  disabled: boolean
}

interface CheckboxFieldProps {
  name: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  error?: string
  disabled: boolean
}

/**
 * Form management hook with validation support (Zod-typed, no 'any')
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T> = {}
) {
  const {
    initialValues = {} as Partial<T>,
    validationSchema,
    validateOnChange = false,
    validateOnBlur = true,
    onSubmit,
    onSuccess,
    onError
  } = options

  const [values, setValuesState] = useState<Partial<T>>(initialValues) // renamed to avoid TS2451
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T, value: unknown): boolean => {
      if (!validationSchema) return true

      // Validate a partial with just this field
      const { isValid, errors: validationErrors } = validateForm(validationSchema, { [name]: value })
      const key = String(name)

      if (isValid || !validationErrors[key]) {
        setErrors(prev => ({ ...prev, [key]: '' }))
        return true
      } else {
        setErrors(prev => ({ ...prev, [key]: validationErrors[key] }))
        return false
      }
    },
    [validationSchema]
  )

  // Validate entire form
  const validateAll = useCallback((): boolean => {
    if (!validationSchema) return true
    const { isValid, errors: validationErrors } = validateForm(validationSchema, values)
    setErrors(validationErrors)
    return isValid
  }, [values, validationSchema])

  // Set a single field value (fully typed, no any)
  const setValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      setValuesState(prev => ({ ...prev, [name]: value }))

      const key = String(name)
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: '' }))
      }

      if (validateOnChange) {
        // Defer to next tick to avoid blocking input
        setTimeout(() => validateField(name, value), 0)
      }
    },
    [errors, validateOnChange, validateField]
  )

  // Set multiple values at once
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState(prev => ({ ...prev, ...newValues }))

      const changedFields = Object.keys(newValues)
      if (changedFields.some(field => errors[field])) {
        setErrors(prev => {
          const next = { ...prev }
          for (const field of changedFields) {
            if (next[field]) next[field] = ''
          }
          return next
        })
      }
    },
    [errors]
  )

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [String(name)]: error }))
  }, [])

  const clearFieldError = useCallback((name: keyof T) => {
    setErrors(prev => ({ ...prev, [String(name)]: '' }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!validateAll() || !onSubmit) return

      setIsSubmitting(true)
      try {
        await onSubmit(values as T)
        onSuccess?.(values as T)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Form submission failed'
        onError?.(errorMessage)
        // eslint-disable-next-line no-console
        console.error('Form submission error:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [validateAll, onSubmit, values, onSuccess, onError]
  )

  const reset = useCallback(
    (newValues?: Partial<T>) => {
      const resetValues = newValues ?? initialValues
      setValuesState(resetValues)
      setErrors({})
      setTouched({})
      setIsSubmitting(false)
    },
    [initialValues]
  )

  const getFieldProps = useCallback(
    (name: keyof T): TextFieldProps => ({
      name: String(name),
      // always provide a string-ish value to text/select controls
      value: String(values[name] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // e.target.value is string; cast via unknown to keep ESLint happy (no 'any')
        setValue(name, (e.target.value as unknown) as T[typeof name])
      },
      onBlur: () => {
        const key = String(name)
        setTouched(prev => ({ ...prev, [key]: true }))
        if (validateOnBlur) {
          validateField(name, values[name] as unknown)
        }
      },
      error: touched[String(name)] ? errors[String(name)] : undefined,
      disabled: isSubmitting
    }),
    [values, errors, touched, isSubmitting, setValue, validateField, validateOnBlur]
  )

  const getCheckboxProps = useCallback(
    (name: keyof T): CheckboxFieldProps => ({
      name: String(name),
      checked: Boolean(values[name]),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        // boolean cast without 'any'
        setValue(name, (e.target.checked as unknown) as T[typeof name])
      },
      onBlur: () => {
        const key = String(name)
        setTouched(prev => ({ ...prev, [key]: true }))
      },
      error: touched[String(name)] ? errors[String(name)] : undefined,
      disabled: isSubmitting
    }),
    [values, errors, touched, isSubmitting, setValue]
  )

  const isValid = Object.values(errors).every(err => !err)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)
  const isTouched = Object.values(touched).some(Boolean)

  const touchedFields = (Object.keys(touched) as string[]).filter(key => touched[key])
  const changedFields = (Object.keys(values) as Array<keyof T>).filter(
    key => values[key] !== initialValues[key]
  ) as string[]

  return {
    // state
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    isTouched,

    // actions
    setValue,
    setValues,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleSubmit,
    reset,
    validate: validateAll,

    // helpers
    getFieldProps,
    getCheckboxProps,

    // derived
    hasErrors: Object.values(errors).some(err => err),
    errorCount: Object.values(errors).filter(err => err).length,
    touchedFields,
    changedFields
  }
}
