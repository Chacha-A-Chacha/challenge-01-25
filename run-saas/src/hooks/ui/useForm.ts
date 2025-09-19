// hooks/ui/useForm.ts
import { useState, useCallback, useEffect } from 'react'
import { validateForm } from '@/lib/validations'
import { debounce } from '@/lib/utils'
import type { z } from 'zod'

interface UseFormOptions<T> {
  initialValues?: Partial<T>
  validationSchema?: z.ZodSchema<T>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
  onSubmit?: (data: T) => Promise<void> | void
}

/**
 * Form state and validation management
 */
export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T> = {}
) {
  const {
    initialValues = {} as Partial<T>,
    validationSchema,
    validateOnChange = false,
    validateOnBlur = true,
    debounceMs = 300,
    onSubmit
  } = options

  const [values, setValues] = useState<Partial<T>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Debounced validation
  const debouncedValidate = useCallback(
    debounce(async (data: Partial<T>) => {
      if (!validationSchema) return

      setIsValidating(true)
      const { isValid, errors: validationErrors } = validateForm(validationSchema, data)
      
      if (!isValid) {
        setErrors(validationErrors)
      } else {
        setErrors({})
      }
      setIsValidating(false)
    }, debounceMs),
    [validationSchema, debounceMs]
  )

  // Validate immediately (without debounce)
  const validate = useCallback(async (data: Partial<T> = values) => {
    if (!validationSchema) return true

    const { isValid, errors: validationErrors } = validateForm(validationSchema, data)
    setErrors(validationErrors)
    return isValid
  }, [validationSchema, values])

  // Set field value
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    if (validateOnChange) {
      const newValues = { ...values, [name]: value }
      debouncedValidate(newValues)
    }
  }, [values, validateOnChange, debouncedValidate])

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
    
    if (validateOnChange) {
      const mergedValues = { ...values, ...newValues }
      debouncedValidate(mergedValues)
    }
  }, [values, validateOnChange, debouncedValidate])

  // Mark field as touched
  const setTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }))
    
    if (validateOnBlur && isTouched) {
      debouncedValidate(values)
    }
  }, [validateOnBlur, values, debouncedValidate])

  // Get field props for input components
  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(name, e.target.value),
    onBlur: () => setTouched(name, true),
    error: touched[name as string] ? errors[name as string] : undefined,
    isInvalid: !!(touched[name as string] && errors[name as string])
  }), [values, errors, touched, setValue, setTouched])

  // Submit handler
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!onSubmit) return
    
    setIsSubmitting(true)
    
    // Mark all fields as touched
    const allFieldNames = Object.keys(values)
    const touchedState = allFieldNames.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
    setTouched(touchedState)
    
    // Validate
    const isValid = await validate(values)
    
    if (isValid) {
      try {
        await onSubmit(values as T)
      } catch (error) {
        console.error('Form submission error:', error)
      }
    }
    
    setIsSubmitting(false)
  }, [onSubmit, values, validate, setTouched])

  // Reset form
  const reset = useCallback((newInitialValues?: Partial<T>) => {
    const resetValues = newInitialValues || initialValues
    setValues(resetValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    setIsValidating(false)
  }, [initialValues])

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0
  const hasErrors = Object.keys(errors).length > 0
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)

  return {
    // Values and state
    values,
    errors,
    touched,
    isSubmitting,
    isValidating,
    isValid,
    hasErrors,
    isDirty,
    
    // Actions
    setValue,
    setValues,
    setTouched,
    validate,
    handleSubmit,
    reset,
    getFieldProps
  }
}

// hooks/ui/useDebounce.ts
import { useState, useEffect } from 'react'

/**
 * Debounce hook for search inputs and API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debouncedCallback] = useState(() => 
    debounce(callback, delay)
  )

  return debouncedCallback as T
}
