// store/course-store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CourseWithDetails,
  CourseStatus,
  BaseStoreState,
  ApiResponse,
  UpdateInput,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";
import {
  validateForm,
  createCourseSchema,
  updateCourseSchema,
} from "@/lib/validations";
import { handleApiError, fetchWithTimeout } from "@/lib/utils";

// ============================================================================
// TYPES - Only what's needed for this store
// ============================================================================

interface CourseFormData {
  courseName: string;
  headTeacherEmail: string;
  headTeacherPassword: string;
  headTeacherFirstName?: string;
  headTeacherLastName?: string;
}

interface CourseFilters {
  search: string;
  status: CourseStatus | "all";
  sortBy: "name" | "createdAt" | "status";
  sortOrder: "asc" | "desc";
}

interface CoursePagination {
  page: number;
  limit: number;
  total: number;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface CourseState extends BaseStoreState {
  // Core data
  courses: CourseWithDetails[];
  selectedCourse: CourseWithDetails | null;

  // UI state
  filters: CourseFilters;
  pagination: CoursePagination;

  // Loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Actions
  loadCourses: () => Promise<void>;
  createCourse: (data: CourseFormData) => Promise<CourseWithDetails | null>;
  updateCourse: (
    id: string,
    data: UpdateInput<CourseWithDetails>,
  ) => Promise<boolean>;
  replaceHeadTeacher: (
    courseId: string,
    newHeadTeacherId: string,
    removeOldTeacher?: boolean,
  ) => Promise<boolean>;
  selectCourse: (course: CourseWithDetails | null) => void;
  setFilters: (filters: Partial<CourseFilters>) => void;
  setPagination: (pagination: Partial<CoursePagination>) => void;

  // Computed
  getFilteredCourses: () => CourseWithDetails[];
  getCourseById: (id: string) => CourseWithDetails | undefined;

  // Utils
  clearErrors: () => void;
  reset: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,

      courses: [],
      selectedCourse: null,

      filters: {
        search: "",
        status: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },

      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },

      isCreating: false,
      isUpdating: false,
      isDeleting: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadCourses: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithTimeout(API_ROUTES.COURSES);
          const result: ApiResponse<CourseWithDetails[]> =
            await response.json();

          if (result.success && result.data) {
            set({
              courses: result.data,
              isLoading: false,
              lastUpdated: new Date(),
              pagination: { ...get().pagination, total: result.data.length },
            });
          } else {
            throw new Error(result.error || "Failed to load courses");
          }
        } catch (error) {
          set({
            error: handleApiError(error).error,
            isLoading: false,
          });
        }
      },

      createCourse: async (data) => {
        set({ isCreating: true, error: null });

        try {
          // Validate data
          const validation = validateForm(createCourseSchema, data);
          if (!validation.isValid || !validation.data) {
            throw new Error(
              Object.values(validation.errors)[0] || "Invalid data",
            );
          }

          const response = await fetchWithTimeout(API_ROUTES.COURSES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validation.data),
          });

          const result: ApiResponse<{ course: CourseWithDetails }> =
            await response.json();

          if (result.success && result.data) {
            const newCourse = result.data.course;

            set((state) => ({
              courses: [newCourse, ...state.courses],
              selectedCourse: newCourse,
              isCreating: false,
              lastUpdated: new Date(),
              pagination: {
                ...state.pagination,
                total: state.pagination.total + 1,
              },
            }));

            return newCourse;
          } else {
            throw new Error(result.error || "Failed to create course");
          }
        } catch (error) {
          set({
            error: handleApiError(error).error,
            isCreating: false,
          });
          return null;
        }
      },

      updateCourse: async (id, updates) => {
        set({ isUpdating: true, error: null });

        try {
          const validation = validateForm(updateCourseSchema, updates);
          if (!validation.isValid || !validation.data) {
            throw new Error("Invalid update data");
          }

          const response = await fetchWithTimeout(
            `${API_ROUTES.COURSES}/${id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(validation.data),
            },
          );

          const result: ApiResponse<CourseWithDetails> = await response.json();

          if (result.success && result.data) {
            set((state) => ({
              courses: state.courses.map((course) =>
                course.id === id ? result.data! : course,
              ),
              selectedCourse:
                state.selectedCourse?.id === id
                  ? result.data
                  : state.selectedCourse,
              isUpdating: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to update course");
          }
        } catch (error) {
          set({
            error: handleApiError(error).error,
            isUpdating: false,
          });
          return false;
        }
      },

      replaceHeadTeacher: async (
        courseId,
        newHeadTeacherId,
        removeOldTeacher = false,
      ) => {
        set({ isUpdating: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `/api/admin/courses/${courseId}/replace-head-teacher`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                newHeadTeacherId,
                removeOldTeacher,
              }),
            },
          );

          const result: ApiResponse<{ course: CourseWithDetails }> =
            await response.json();

          if (result.success && result.data) {
            const updatedCourse = result.data.course;

            set((state) => ({
              courses: state.courses.map((course) =>
                course.id === courseId ? updatedCourse : course,
              ),
              selectedCourse:
                state.selectedCourse?.id === courseId
                  ? updatedCourse
                  : state.selectedCourse,
              isUpdating: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to replace head teacher");
          }
        } catch (error) {
          set({
            error: handleApiError(error).error,
            isUpdating: false,
          });
          return false;
        }
      },

      selectCourse: (course) => {
        set({ selectedCourse: course });
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, page: 1 }, // Reset pagination on filter change
        }));
      },

      setPagination: (newPagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...newPagination },
        }));
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getFilteredCourses: () => {
        const { courses, filters } = get();
        let filtered = [...courses];

        // Search filter
        if (filters.search.trim()) {
          const query = filters.search.toLowerCase();
          filtered = filtered.filter((course) => {
            const teacherName =
              `${course.headTeacher.firstName} ${course.headTeacher.lastName}`.toLowerCase();
            return (
              course.name.toLowerCase().includes(query) ||
              course.headTeacher.email.toLowerCase().includes(query) ||
              teacherName.includes(query)
            );
          });
        }

        // Status filter
        if (filters.status !== "all") {
          filtered = filtered.filter(
            (course) => course.status === filters.status,
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let comparison = 0;

          switch (filters.sortBy) {
            case "name":
              comparison = a.name.localeCompare(b.name);
              break;
            case "createdAt":
              comparison =
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime();
              break;
            case "status":
              comparison = a.status.localeCompare(b.status);
              break;
          }

          return filters.sortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
      },

      getCourseById: (id) => {
        return get().courses.find((course) => course.id === id);
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      clearErrors: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          courses: [],
          selectedCourse: null,
          filters: {
            search: "",
            status: "all",
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
          },
          isLoading: false,
          isCreating: false,
          isUpdating: false,
          isDeleting: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: "course-store",
      partialize: (state) => ({
        selectedCourse: state.selectedCourse,
        filters: state.filters,
        pagination: state.pagination,
      }),
    },
  ),
);
