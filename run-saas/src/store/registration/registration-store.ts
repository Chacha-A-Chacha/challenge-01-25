// store/registration/registration-store.ts
import { create } from "zustand";
import type {
  CoursePublic,
  CourseSessionsResponse,
  StudentRegistrationResponse,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";

// ============================================================================
// TYPES
// ============================================================================

interface RegistrationFormData {
  courseId: string;
  saturdaySessionId: string;
  sundaySessionId: string;
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  paymentReceiptNo: string;
  paymentReceiptUrl: string;
}

interface RegistrationStore {
  // Form data
  formData: RegistrationFormData;

  // API data
  courses: CoursePublic[];
  sessions: CourseSessionsResponse | null;

  // UI state
  isLoadingCourses: boolean;
  isLoadingSessions: boolean;
  isSubmitting: boolean;
  error: string | null;
  submissionResult: StudentRegistrationResponse | null;

  // Actions
  setField: (field: keyof RegistrationFormData, value: string) => void;
  loadCourses: () => Promise<void>;
  loadSessions: (courseId: string) => Promise<void>;
  submit: () => Promise<boolean>;
  reset: () => void;
}

const INITIAL_FORM: RegistrationFormData = {
  courseId: "",
  saturdaySessionId: "",
  sundaySessionId: "",
  surname: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  paymentReceiptNo: "",
  paymentReceiptUrl: "",
};

// ============================================================================
// STORE
// ============================================================================

export const useRegistrationStore = create<RegistrationStore>((set, get) => ({
  formData: { ...INITIAL_FORM },
  courses: [],
  sessions: null,
  isLoadingCourses: false,
  isLoadingSessions: false,
  isSubmitting: false,
  error: null,
  submissionResult: null,

  setField: (field, value) => {
    set((state) => ({
      formData: { ...state.formData, [field]: value },
      error: null,
    }));

    // Auto-load sessions when course changes
    if (field === "courseId" && value) {
      get().loadSessions(value);
    }
  },

  loadCourses: async () => {
    set({ isLoadingCourses: true, error: null });
    try {
      const res = await fetch(API_ROUTES.REGISTER.COURSES);
      const data = await res.json();

      if (data.success) {
        set({ courses: data.data, isLoadingCourses: false });
      } else {
        throw new Error(data.error || "Failed to load courses");
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load courses",
        isLoadingCourses: false,
      });
    }
  },

  loadSessions: async (courseId: string) => {
    set({
      isLoadingSessions: true,
      error: null,
      sessions: null,
      formData: {
        ...get().formData,
        saturdaySessionId: "",
        sundaySessionId: "",
      },
    });

    try {
      const res = await fetch(API_ROUTES.REGISTER.SESSIONS(courseId));
      const data = await res.json();

      if (data.success) {
        set({ sessions: data.data, isLoadingSessions: false });
      } else {
        throw new Error(data.error || "Failed to load sessions");
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load sessions",
        isLoadingSessions: false,
      });
    }
  },

  submit: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: null });

    try {
      const res = await fetch(API_ROUTES.REGISTER.SUBMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        set({ submissionResult: data.data, isSubmitting: false });
        return true;
      } else {
        throw new Error(data.error || "Registration failed");
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Registration failed",
        isSubmitting: false,
      });
      return false;
    }
  },

  reset: () =>
    set({
      formData: { ...INITIAL_FORM },
      courses: [],
      sessions: null,
      error: null,
      submissionResult: null,
    }),
}));
