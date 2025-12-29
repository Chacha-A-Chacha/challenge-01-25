import { create } from "zustand";
import type { ApiResponse, PaginatedResponse } from "@/types";
import { API_ROUTES } from "@/lib/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface RegistrationDetail {
  id: string;
  surname: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  courseName: string;
  saturdaySession: {
    id: string;
    time: string;
    className: string;
  };
  sundaySession: {
    id: string;
    time: string;
    className: string;
  };
  paymentReceiptUrl: string;
  paymentReceiptNo: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface RegistrationFilters {
  status: "PENDING" | "APPROVED" | "REJECTED" | "all";
  search: string;
  page: number;
  limit: number;
}

interface RegistrationApprovalStore {
  // Data
  registrations: RegistrationDetail[];
  selectedRegistration: RegistrationDetail | null;
  selectedForBulk: Set<string>; // IDs of selected registrations for bulk approval

  // Pagination
  total: number;
  hasMore: boolean;

  // Filters
  filters: RegistrationFilters;

  // Loading states
  isLoading: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  error: string | null;

  // Actions
  loadRegistrations: () => Promise<void>;
  selectRegistration: (registration: RegistrationDetail | null) => void;
  approveRegistration: (id: string) => Promise<boolean>;
  rejectRegistration: (id: string, reason: string) => Promise<boolean>;
  bulkApprove: (ids: string[]) => Promise<boolean>;

  // Bulk selection
  toggleBulkSelection: (id: string) => void;
  selectAllOnPage: () => void;
  clearBulkSelection: () => void;

  // Filters
  setFilters: (filters: Partial<RegistrationFilters>) => void;
  setPage: (page: number) => void;

  // Utils
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FILTERS: RegistrationFilters = {
  status: "PENDING",
  search: "",
  page: 1,
  limit: 20,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useRegistrationApprovalStore = create<RegistrationApprovalStore>(
  (set, get) => ({
    // Data
    registrations: [],
    selectedRegistration: null,
    selectedForBulk: new Set(),

    // Pagination
    total: 0,
    hasMore: false,

    // Filters
    filters: DEFAULT_FILTERS,

    // Loading states
    isLoading: false,
    isApproving: false,
    isRejecting: false,
    error: null,

    // ============================================================================
    // ACTIONS
    // ============================================================================

    loadRegistrations: async () => {
      const { filters } = get();
      set({ isLoading: true, error: null });

      try {
        const params = new URLSearchParams({
          status: filters.status,
          page: filters.page.toString(),
          limit: filters.limit.toString(),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(
          `${API_ROUTES.TEACHER.REGISTRATIONS}?${params}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load registrations: ${response.status}`);
        }

        const result: ApiResponse<PaginatedResponse<RegistrationDetail>> =
          await response.json();

        if (result.success && result.data) {
          set({
            registrations: result.data.data,
            total: result.data.total,
            hasMore: result.data.hasMore,
            isLoading: false,
          });
        } else {
          throw new Error(result.error || "Failed to load registrations");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load registrations";
        set({ error: errorMessage, isLoading: false });
      }
    },

    selectRegistration: (registration) => {
      set({ selectedRegistration: registration });
    },

    approveRegistration: async (id) => {
      set({ isApproving: true, error: null });

      try {
        const response = await fetch(API_ROUTES.TEACHER.APPROVE(id), {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Failed to approve registration: ${response.status}`);
        }

        const result: ApiResponse<void> = await response.json();

        if (result.success) {
          // Remove from list or refresh
          set((state) => ({
            registrations: state.registrations.filter((r) => r.id !== id),
            selectedRegistration:
              state.selectedRegistration?.id === id
                ? null
                : state.selectedRegistration,
            isApproving: false,
          }));

          // Refresh to update counts
          await get().loadRegistrations();
          return true;
        } else {
          throw new Error(result.error || "Failed to approve registration");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to approve registration";
        set({ error: errorMessage, isApproving: false });
        return false;
      }
    },

    rejectRegistration: async (id, reason) => {
      set({ isRejecting: true, error: null });

      try {
        const response = await fetch(API_ROUTES.TEACHER.REJECT(id), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          throw new Error(`Failed to reject registration: ${response.status}`);
        }

        const result: ApiResponse<void> = await response.json();

        if (result.success) {
          // Remove from list or refresh
          set((state) => ({
            registrations: state.registrations.filter((r) => r.id !== id),
            selectedRegistration:
              state.selectedRegistration?.id === id
                ? null
                : state.selectedRegistration,
            isRejecting: false,
          }));

          // Refresh to update counts
          await get().loadRegistrations();
          return true;
        } else {
          throw new Error(result.error || "Failed to reject registration");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to reject registration";
        set({ error: errorMessage, isRejecting: false });
        return false;
      }
    },

    bulkApprove: async (ids) => {
      set({ isApproving: true, error: null });

      try {
        const response = await fetch(API_ROUTES.TEACHER.BULK_APPROVE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationIds: ids }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to bulk approve registrations: ${response.status}`,
          );
        }

        const result: ApiResponse<void> = await response.json();

        if (result.success) {
          // Clear bulk selection and refresh
          set({
            selectedForBulk: new Set(),
            isApproving: false,
          });

          await get().loadRegistrations();
          return true;
        } else {
          throw new Error(result.error || "Failed to bulk approve");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to bulk approve";
        set({ error: errorMessage, isApproving: false });
        return false;
      }
    },

    // ============================================================================
    // BULK SELECTION
    // ============================================================================

    toggleBulkSelection: (id) => {
      set((state) => {
        const newSelected = new Set(state.selectedForBulk);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return { selectedForBulk: newSelected };
      });
    },

    selectAllOnPage: () => {
      set((state) => {
        const pendingIds = state.registrations
          .filter((r) => r.status === "PENDING")
          .map((r) => r.id);
        return { selectedForBulk: new Set(pendingIds) };
      });
    },

    clearBulkSelection: () => {
      set({ selectedForBulk: new Set() });
    },

    // ============================================================================
    // FILTERS
    // ============================================================================

    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters, page: 1 }, // Reset to page 1 on filter change
        selectedForBulk: new Set(), // Clear selection on filter change
      }));

      // Auto-reload
      get().loadRegistrations();
    },

    setPage: (page) => {
      set((state) => ({
        filters: { ...state.filters, page },
      }));

      // Auto-reload
      get().loadRegistrations();
    },

    // ============================================================================
    // UTILS
    // ============================================================================

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        registrations: [],
        selectedRegistration: null,
        selectedForBulk: new Set(),
        total: 0,
        hasMore: false,
        filters: DEFAULT_FILTERS,
        isLoading: false,
        isApproving: false,
        isRejecting: false,
        error: null,
      });
    },
  }),
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for registration data
 */
export function useRegistrations() {
  const registrations = useRegistrationApprovalStore(
    (state) => state.registrations,
  );
  const selectedRegistration = useRegistrationApprovalStore(
    (state) => state.selectedRegistration,
  );
  const total = useRegistrationApprovalStore((state) => state.total);
  const hasMore = useRegistrationApprovalStore((state) => state.hasMore);
  const isLoading = useRegistrationApprovalStore((state) => state.isLoading);
  const error = useRegistrationApprovalStore((state) => state.error);
  const loadRegistrations = useRegistrationApprovalStore(
    (state) => state.loadRegistrations,
  );
  const selectRegistration = useRegistrationApprovalStore(
    (state) => state.selectRegistration,
  );

  return {
    registrations,
    selectedRegistration,
    total,
    hasMore,
    isLoading,
    error,
    loadRegistrations,
    selectRegistration,
  };
}

/**
 * Hook for registration approval actions
 */
export function useRegistrationActions() {
  const approveRegistration = useRegistrationApprovalStore(
    (state) => state.approveRegistration,
  );
  const rejectRegistration = useRegistrationApprovalStore(
    (state) => state.rejectRegistration,
  );
  const bulkApprove = useRegistrationApprovalStore(
    (state) => state.bulkApprove,
  );
  const isApproving = useRegistrationApprovalStore(
    (state) => state.isApproving,
  );
  const isRejecting = useRegistrationApprovalStore(
    (state) => state.isRejecting,
  );
  const error = useRegistrationApprovalStore((state) => state.error);
  const clearError = useRegistrationApprovalStore((state) => state.clearError);

  return {
    approveRegistration,
    rejectRegistration,
    bulkApprove,
    isApproving,
    isRejecting,
    error,
    clearError,
  };
}

/**
 * Hook for bulk selection
 */
export function useBulkSelection() {
  const selectedForBulk = useRegistrationApprovalStore(
    (state) => state.selectedForBulk,
  );
  const toggleBulkSelection = useRegistrationApprovalStore(
    (state) => state.toggleBulkSelection,
  );
  const selectAllOnPage = useRegistrationApprovalStore(
    (state) => state.selectAllOnPage,
  );
  const clearBulkSelection = useRegistrationApprovalStore(
    (state) => state.clearBulkSelection,
  );

  return {
    selectedForBulk,
    toggleBulkSelection,
    selectAllOnPage,
    clearBulkSelection,
  };
}

/**
 * Hook for filters and pagination
 */
export function useRegistrationFilters() {
  const filters = useRegistrationApprovalStore((state) => state.filters);
  const setFilters = useRegistrationApprovalStore((state) => state.setFilters);
  const setPage = useRegistrationApprovalStore((state) => state.setPage);

  return {
    filters,
    setFilters,
    setPage,
  };
}
