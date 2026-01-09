// store/registration/registration-store.ts
import { create } from "zustand";
import type {
  CoursePublic,
  ClassPublic,
  CourseSessionsResponse,
  StudentRegistrationResponse,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";

// ============================================================================
// TYPES
// ============================================================================

interface RegistrationFormData {
  courseId: string;
  classId: string; // NEW - ensures same class for both sessions
  saturdaySessionId: string;
  sundaySessionId: string;
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  portraitPhotoUrl: string;
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
  classes: ClassPublic[]; // NEW
  sessions: CourseSessionsResponse | null;

  // UI state
  isLoadingCourses: boolean;
  isLoadingClasses: boolean; // NEW
  isLoadingSessions: boolean;
  isSubmitting: boolean;
  error: string | null;
  submissionResult: StudentRegistrationResponse | null;

  // Actions
  setField: (field: keyof RegistrationFormData, value: string) => void;
  loadCourses: () => Promise<void>;
  loadClasses: (courseId: string) => Promise<void>; // NEW
  loadSessions: (courseId: string, classId: string) => Promise<void>; // UPDATED
  submit: () => Promise<boolean>;
  reset: () => void;
}

const INITIAL_FORM: RegistrationFormData = {
  courseId: "",
  classId: "", // NEW
  saturdaySessionId: "",
  sundaySessionId: "",
  surname: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  portraitPhotoUrl: "",
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
  classes: [], // NEW
  sessions: null,
  isLoadingCourses: false,
  isLoadingClasses: false, // NEW
  isLoadingSessions: false,
  isSubmitting: false,
  error: null,
  submissionResult: null,

  setField: (field, value) => {
    set((state) => ({
      formData: { ...state.formData, [field]: value },
      error: null,
    }));

    // Auto-load classes when course changes
    if (field === "courseId" && value) {
      get().loadClasses(value);
      // Clear downstream selections
      set((state) => ({
        formData: {
          ...state.formData,
          classId: "",
          saturdaySessionId: "",
          sundaySessionId: "",
        },
        classes: [],
        sessions: null,
      }));
    }

    // Auto-load sessions when class changes
    if (field === "classId" && value) {
      const courseId = get().formData.courseId;
      get().loadSessions(courseId, value);
      // Clear session selections
      set((state) => ({
        formData: {
          ...state.formData,
          saturdaySessionId: "",
          sundaySessionId: "",
        },
      }));
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

  loadClasses: async (courseId: string) => {
    set({
      isLoadingClasses: true,
      error: null,
      classes: [],
    });

    try {
      const res = await fetch(API_ROUTES.REGISTER.CLASSES(courseId));
      const data = await res.json();

      if (data.success) {
        set({ classes: data.data.classes, isLoadingClasses: false });
      } else {
        throw new Error(data.error || "Failed to load classes");
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load classes",
        isLoadingClasses: false,
      });
    }
  },

  loadSessions: async (courseId: string, classId: string) => {
    set({
      isLoadingSessions: true,
      error: null,
      sessions: null,
    });

    try {
      const res = await fetch(API_ROUTES.REGISTER.SESSIONS(courseId, classId));
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
      classes: [], // NEW
      sessions: null,
      error: null,
      submissionResult: null,
    }),
}));
