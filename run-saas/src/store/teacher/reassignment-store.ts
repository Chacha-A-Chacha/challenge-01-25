// store/teacher/reassignment-store.ts
import { create } from "zustand";
import type { BaseStoreState, ApiResponse } from "@/types";
import { API_ROUTES } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/utils";
import type { ReassignmentRequestDetail } from "@/lib/db";

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ReassignmentManagementState extends BaseStoreState {
  // Core data
  requests: ReassignmentRequestDetail[];

  // Filter state
  statusFilter: "all" | "PENDING" | "APPROVED" | "DENIED";
  searchQuery: string;

  // Loading states
  isApproving: boolean;
  isDenying: boolean;

  // Actions
  loadRequests: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<boolean>;
  denyRequest: (requestId: string) => Promise<boolean>;
  setStatusFilter: (status: "all" | "PENDING" | "APPROVED" | "DENIED") => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredRequests: () => ReassignmentRequestDetail[];
  getPendingCount: () => number;
  getApprovedCount: () => number;
  getDeniedCount: () => number;

  // Utils
  clearErrors: () => void;
  reset: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useReassignmentManagementStore =
  create<ReassignmentManagementState>((set, get) => ({
    // Base state
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Core data
    requests: [],

    // Filter state
    statusFilter: "all",
    searchQuery: "",

    // Loading states
    isApproving: false,
    isDenying: false,

    // ============================================================================
    // ACTIONS
    // ============================================================================

    loadRequests: async () => {
      set({ isLoading: true, error: null });

      try {
        const { statusFilter } = get();
        const url =
          statusFilter === "all"
            ? API_ROUTES.TEACHER.REASSIGNMENTS
            : `${API_ROUTES.TEACHER.REASSIGNMENTS}?status=${statusFilter}`;

        const response = await fetchWithTimeout(url);

        if (!response.ok) {
          throw new Error(`Failed to load requests: ${response.status}`);
        }

        const result: ApiResponse<ReassignmentRequestDetail[]> =
          await response.json();

        if (result.success && result.data) {
          set({
            requests: result.data,
            isLoading: false,
            lastUpdated: new Date(),
          });
        } else {
          throw new Error(
            result.error || "Failed to load reassignment requests",
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load requests";
        set({
          error: errorMessage,
          isLoading: false,
        });
      }
    },

    approveRequest: async (requestId) => {
      set({ isApproving: true, error: null });

      try {
        const response = await fetchWithTimeout(
          API_ROUTES.TEACHER.APPROVE_REASSIGNMENT(requestId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error(`Approval failed: ${response.status}`);
        }

        const result: ApiResponse<{ message: string }> = await response.json();

        if (result.success) {
          // Update the request status in state
          set((state) => ({
            requests: state.requests.map((req) =>
              req.id === requestId
                ? { ...req, status: "APPROVED" as const }
                : req,
            ),
            isApproving: false,
            lastUpdated: new Date(),
          }));

          return true;
        } else {
          throw new Error(result.error || "Failed to approve request");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to approve request";
        set({
          error: errorMessage,
          isApproving: false,
        });
        return false;
      }
    },

    denyRequest: async (requestId) => {
      set({ isDenying: true, error: null });

      try {
        const response = await fetchWithTimeout(
          API_ROUTES.TEACHER.DENY_REASSIGNMENT(requestId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error(`Denial failed: ${response.status}`);
        }

        const result: ApiResponse<{ message: string }> = await response.json();

        if (result.success) {
          // Update the request status in state
          set((state) => ({
            requests: state.requests.map((req) =>
              req.id === requestId
                ? { ...req, status: "DENIED" as const }
                : req,
            ),
            isDenying: false,
            lastUpdated: new Date(),
          }));

          return true;
        } else {
          throw new Error(result.error || "Failed to deny request");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to deny request";
        set({
          error: errorMessage,
          isDenying: false,
        });
        return false;
      }
    },

    setStatusFilter: (status) => {
      set({ statusFilter: status });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================

    getFilteredRequests: () => {
      const { requests, searchQuery } = get();

      if (!searchQuery.trim()) {
        return requests;
      }

      const query = searchQuery.toLowerCase();
      return requests.filter(
        (req) =>
          req.studentName.toLowerCase().includes(query) ||
          req.studentNumber.toLowerCase().includes(query) ||
          req.className.toLowerCase().includes(query),
      );
    },

    getPendingCount: () => {
      return get().requests.filter((req) => req.status === "PENDING").length;
    },

    getApprovedCount: () => {
      return get().requests.filter((req) => req.status === "APPROVED").length;
    },

    getDeniedCount: () => {
      return get().requests.filter((req) => req.status === "DENIED").length;
    },

    // ============================================================================
    // UTILITIES
    // ============================================================================

    clearErrors: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        requests: [],
        statusFilter: "all",
        searchQuery: "",
        isApproving: false,
        isDenying: false,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    },
  }));

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for reassignment requests data
 */
export function useReassignmentRequests() {
  return useReassignmentManagementStore((state) => ({
    requests: state.requests,
    filteredRequests: state.getFilteredRequests(),
    isLoading: state.isLoading,
    loadRequests: state.loadRequests,
  }));
}

/**
 * Hook for reassignment actions
 */
export function useReassignmentActions() {
  return useReassignmentManagementStore((state) => ({
    approveRequest: state.approveRequest,
    denyRequest: state.denyRequest,
    isApproving: state.isApproving,
    isDenying: state.isDenying,
    error: state.error,
    clearErrors: state.clearErrors,
  }));
}

/**
 * Hook for reassignment filters
 */
export function useReassignmentFilters() {
  return useReassignmentManagementStore((state) => ({
    statusFilter: state.statusFilter,
    searchQuery: state.searchQuery,
    setStatusFilter: state.setStatusFilter,
    setSearchQuery: state.setSearchQuery,
  }));
}

/**
 * Hook for reassignment stats
 */
export function useReassignmentStats() {
  return useReassignmentManagementStore((state) => ({
    total: state.requests.length,
    pending: state.getPendingCount(),
    approved: state.getApprovedCount(),
    denied: state.getDeniedCount(),
  }));
}
