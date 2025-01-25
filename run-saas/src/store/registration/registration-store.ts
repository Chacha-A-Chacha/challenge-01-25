// store/registration/registration-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    BaseStoreState,
    ApiResponse,
    CoursePublic,
    CourseSessionsResponse,
    SessionWithAvailability,
    StudentRegistrationResponse
} from '@/types'
import { API_ROUTES } from '@/lib/constants'
import { fetchWithTimeout, handleApiError } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface RegistrationFormData {
    // Course & Sessions
    courseId: string
    saturdaySessionId: string
    sundaySessionId: string

    // Personal Info
    surname: string
    firstName: string
    lastName: string
    email: string
    phoneNumber: string

    // Password
    password: string
    confirmPassword: string

    // Payment
    paymentReceiptNo: string
    paymentReceiptUrl: string
}

interface SubmissionResult {
    registrationId: string
    email: string
    courseName: string
    saturdaySession: string
    sundaySession: string
    submittedAt: string
}

const INITIAL_FORM_DATA: RegistrationFormData = {
    courseId: '',
    saturdaySessionId: '',
    sundaySessionId: '',
    surname: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    paymentReceiptNo: '',
    paymentReceiptUrl: ''
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface RegistrationState extends BaseStoreState {
    // Form data
    formData: RegistrationFormData

    // API data
    courses: CoursePublic[]
    sessions: CourseSessionsResponse | null

    // Loading states
    isLoadingCourses: boolean
    isLoadingSessions: boolean
    isSubmitting: boolean
    isUploadingReceipt: boolean

    // Submission result (for confirmation page)
    submissionResult: SubmissionResult | null

    // Field errors
    fieldErrors: Partial<Record<keyof RegistrationFormData, string>>

    // Actions - Data fetching
    loadCourses: () => Promise<void>
    loadSessions: (courseId: string) => Promise<void>

    // Actions - Form management
    updateFormData: <K extends keyof RegistrationFormData>(
        field: K,
        value: RegistrationFormData[K]
    ) => void
    updateMultipleFields: (data: Partial<RegistrationFormData>) => void
    setFieldError: (field: keyof RegistrationFormData, error: string) => void
    clearFieldError: (field: keyof RegistrationFormData) => void
    clearAllErrors: () => void

    // Actions - Submission
    submitRegistration: () => Promise<boolean>
    setReceiptUrl: (url: string) => void

    // Computed/Helpers
    getSelectedCourse: () => CoursePublic | null
    getSelectedSaturdaySession: () => SessionWithAvailability | null
    getSelectedSundaySession: () => SessionWithAvailability | null
    isFormValid: () => boolean

    // Utils
    reset: () => void
    resetForm: () => void
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useRegistrationStore = create<RegistrationState>()(
    persist(
        (set, get) => ({
            // ================================================================
            // INITIAL STATE
            // ================================================================
            isLoading: false,
            error: null,
            lastUpdated: null,

            formData: { ...INITIAL_FORM_DATA },
            courses: [],
            sessions: null,

            isLoadingCourses: false,
            isLoadingSessions: false,
            isSubmitting: false,
            isUploadingReceipt: false,

            submissionResult: null,
            fieldErrors: {},

            // ================================================================
            // DATA FETCHING ACTIONS
            // ================================================================

            loadCourses: async () => {
                set({ isLoadingCourses: true, error: null })

                try {
                    const response = await fetchWithTimeout(API_ROUTES.REGISTER.COURSES)
                    const result: ApiResponse<CoursePublic[]> = await response.json()

                    if (result.success && result.data) {
                        set({
                            courses: result.data,
                            isLoadingCourses: false,
                            lastUpdated: new Date()
                        })
                    } else {
                        throw new Error(result.error || 'Failed to load courses')
                    }
                } catch (error) {
                    set({
                        error: handleApiError(error).error,
                        isLoadingCourses: false
                    })
                }
            },

            loadSessions: async (courseId: string) => {
                set({ 
                    isLoadingSessions: true, 
                    error: null,
                    sessions: null,
                    // Clear session selections when course changes
                    formData: {
                        ...get().formData,
                        saturdaySessionId: '',
                        sundaySessionId: ''
                    }
                })

                try {
                    const url = API_ROUTES.REGISTER.SESSIONS(courseId)
                    const response = await fetchWithTimeout(url)
                    const result: ApiResponse<CourseSessionsResponse> = await response.json()

                    if (result.success && result.data) {
                        set({
                            sessions: result.data,
                            isLoadingSessions: false
                        })
                    } else {
                        throw new Error(result.error || 'Failed to load sessions')
                    }
                } catch (error) {
                    set({
                        error: handleApiError(error).error,
                        isLoadingSessions: false
                    })
                }
            },

            // ================================================================
            // FORM MANAGEMENT ACTIONS
            // ================================================================

            updateFormData: (field, value) => {
                set(state => ({
                    formData: {
                        ...state.formData,
                        [field]: value
                    },
                    // Clear field error when user updates the field
                    fieldErrors: {
                        ...state.fieldErrors,
                        [field]: undefined
                    }
                }))

                // If course changed, load sessions
                if (field === 'courseId' && value) {
                    get().loadSessions(value as string)
                }
            },

            updateMultipleFields: (data) => {
                set(state => ({
                    formData: {
                        ...state.formData,
                        ...data
                    }
                }))
            },

            setFieldError: (field, error) => {
                set(state => ({
                    fieldErrors: {
                        ...state.fieldErrors,
                        [field]: error
                    }
                }))
            },

            clearFieldError: (field) => {
                set(state => ({
                    fieldErrors: {
                        ...state.fieldErrors,
                        [field]: undefined
                    }
                }))
            },

            clearAllErrors: () => {
                set({ fieldErrors: {}, error: null })
            },

            setReceiptUrl: (url) => {
                set(state => ({
                    formData: {
                        ...state.formData,
                        paymentReceiptUrl: url
                    }
                }))
            },

            // ================================================================
            // SUBMISSION ACTION
            // ================================================================

            submitRegistration: async () => {
                const { formData } = get()

                set({ isSubmitting: true, error: null, fieldErrors: {} })

                try {
                    const response = await fetchWithTimeout(API_ROUTES.REGISTER.SUBMIT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            courseId: formData.courseId,
                            saturdaySessionId: formData.saturdaySessionId,
                            sundaySessionId: formData.sundaySessionId,
                            surname: formData.surname,
                            firstName: formData.firstName,
                            lastName: formData.lastName || undefined,
                            email: formData.email,
                            phoneNumber: formData.phoneNumber || undefined,
                            password: formData.password,
                            confirmPassword: formData.confirmPassword,
                            paymentReceiptUrl: formData.paymentReceiptUrl,
                            paymentReceiptNo: formData.paymentReceiptNo
                        })
                    })

                    const result: ApiResponse<StudentRegistrationResponse> = await response.json()

                    if (result.success && result.data) {
                        set({
                            submissionResult: result.data,
                            isSubmitting: false
                        })
                        return true
                    } else {
                        // Handle validation errors from API
                        if ((result as any).details) {
                            set({
                                fieldErrors: (result as any).details,
                                isSubmitting: false
                            })
                        } else {
                            set({
                                error: result.error || 'Registration failed',
                                isSubmitting: false
                            })
                        }
                        return false
                    }
                } catch (error) {
                    set({
                        error: handleApiError(error).error,
                        isSubmitting: false
                    })
                    return false
                }
            },

            // ================================================================
            // COMPUTED/HELPERS
            // ================================================================

            getSelectedCourse: () => {
                const { courses, formData } = get()
                return courses.find(c => c.id === formData.courseId) || null
            },

            getSelectedSaturdaySession: () => {
                const { sessions, formData } = get()
                if (!sessions) return null
                return sessions.saturday.find(s => s.id === formData.saturdaySessionId) || null
            },

            getSelectedSundaySession: () => {
                const { sessions, formData } = get()
                if (!sessions) return null
                return sessions.sunday.find(s => s.id === formData.sundaySessionId) || null
            },

            isFormValid: () => {
                const { formData } = get()
                return !!(
                    formData.courseId &&
                    formData.saturdaySessionId &&
                    formData.sundaySessionId &&
                    formData.surname.trim() &&
                    formData.firstName.trim() &&
                    formData.email.trim() &&
                    formData.password &&
                    formData.confirmPassword &&
                    formData.password === formData.confirmPassword &&
                    formData.paymentReceiptNo.trim() &&
                    formData.paymentReceiptUrl
                )
            },

            // ================================================================
            // UTILS
            // ================================================================

            reset: () => {
                set({
                    isLoading: false,
                    error: null,
                    lastUpdated: null,
                    formData: { ...INITIAL_FORM_DATA },
                    courses: [],
                    sessions: null,
                    isLoadingCourses: false,
                    isLoadingSessions: false,
                    isSubmitting: false,
                    isUploadingReceipt: false,
                    submissionResult: null,
                    fieldErrors: {}
                })
            },

            resetForm: () => {
                set({
                    formData: { ...INITIAL_FORM_DATA },
                    sessions: null,
                    fieldErrors: {},
                    error: null,
                    submissionResult: null
                })
            }
        }),
        {
            name: 'registration-store',
            // Only persist submission result (for confirmation page refresh)
            partialize: (state) => ({
                submissionResult: state.submissionResult
            })
        }
    )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/**
 * Hook to access form data and update functions
 */
export function useRegistrationForm() {
    return useRegistrationStore(state => ({
        formData: state.formData,
        fieldErrors: state.fieldErrors,
        updateFormData: state.updateFormData,
        updateMultipleFields: state.updateMultipleFields,
        setFieldError: state.setFieldError,
        clearFieldError: state.clearFieldError,
        clearAllErrors: state.clearAllErrors,
        isFormValid: state.isFormValid,
        resetForm: state.resetForm
    }))
}

/**
 * Hook to access course and session data
 */
export function useRegistrationData() {
    return useRegistrationStore(state => ({
        courses: state.courses,
        sessions: state.sessions,
        isLoadingCourses: state.isLoadingCourses,
        isLoadingSessions: state.isLoadingSessions,
        loadCourses: state.loadCourses,
        loadSessions: state.loadSessions,
        getSelectedCourse: state.getSelectedCourse,
        getSelectedSaturdaySession: state.getSelectedSaturdaySession,
        getSelectedSundaySession: state.getSelectedSundaySession
    }))
}

/**
 * Hook for submission state
 */
export function useRegistrationSubmission() {
    return useRegistrationStore(state => ({
        isSubmitting: state.isSubmitting,
        submissionResult: state.submissionResult,
        error: state.error,
        submitRegistration: state.submitRegistration,
        setReceiptUrl: state.setReceiptUrl
    }))
}
