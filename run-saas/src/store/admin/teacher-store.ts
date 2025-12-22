import { create } from "zustand";
import type { TeacherWithCourse } from "@/types";

interface TeacherStore {
  teachers: TeacherWithCourse[];
  selectedTeacher: TeacherWithCourse | null;
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;

  // Actions
  loadTeachers: () => Promise<void>;
  selectTeacher: (teacher: TeacherWithCourse | null) => void;
  deactivateTeacher: (teacherId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useTeacherStore = create<TeacherStore>((set, get) => ({
  teachers: [],
  selectedTeacher: null,
  isLoading: false,
  isDeleting: false,
  error: null,

  loadTeachers: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/admin/teachers");

      if (!response.ok) {
        throw new Error(`Failed to load teachers: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        set({ teachers: result.data, isLoading: false });
      } else {
        throw new Error(result.error || "Failed to load teachers");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load teachers";
      set({ error: errorMessage, isLoading: false });
      console.error("Error loading teachers:", error);
    }
  },

  selectTeacher: (teacher) => {
    set({ selectedTeacher: teacher });
  },

  deactivateTeacher: async (teacherId: string) => {
    set({ isDeleting: true, error: null });

    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}/deactivate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to deactivate teacher: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Remove the deactivated teacher from the list
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== teacherId),
          isDeleting: false,
          selectedTeacher:
            state.selectedTeacher?.id === teacherId
              ? null
              : state.selectedTeacher,
        }));
        return true;
      } else {
        throw new Error(result.error || "Failed to deactivate teacher");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to deactivate teacher";
      set({ error: errorMessage, isDeleting: false });
      console.error("Error deactivating teacher:", error);
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
