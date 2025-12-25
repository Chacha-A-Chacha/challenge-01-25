// store/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuthUser,
  UserRole,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UserType,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";
import { USER_ROLES } from "@/types";

interface AuthState {
  // Session state (synced from NextAuth)
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";

  // Actions
  syncSession: (sessionData: { user?: AuthUser } | null) => void;
  clearSession: () => void;

  // Computed
  getUserRole: () => UserRole | null;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isStudent: () => boolean;
}

// types for password management states
interface ForgotPasswordState {
  email: string;
  userType: UserType;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

interface ResetPasswordState {
  token: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

interface ChangePasswordState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

interface PasswordStore {
  // Forgot Password
  forgotPassword: ForgotPasswordState;
  setForgotPasswordField: (
    field: keyof Omit<ForgotPasswordState, "isLoading" | "error" | "success">,
    value: string,
  ) => void;
  submitForgotPassword: () => Promise<boolean>;
  resetForgotPassword: () => void;

  // Reset Password
  resetPassword: ResetPasswordState;
  setResetPasswordField: (
    field: keyof Omit<ResetPasswordState, "isLoading" | "error" | "success">,
    value: string,
  ) => void;
  submitResetPassword: () => Promise<boolean>;
  resetResetPassword: () => void;

  // Change Password
  changePassword: ChangePasswordState;
  setChangePasswordField: (
    field: keyof Omit<ChangePasswordState, "isLoading" | "error" | "success">,
    value: string,
  ) => void;
  submitChangePassword: () => Promise<boolean>;
  resetChangePassword: () => void;
}

// Initial states
const INITIAL_FORGOT_PASSWORD: ForgotPasswordState = {
  email: "",
  userType: "student",
  isLoading: false,
  error: null,
  success: false,
};

const INITIAL_RESET_PASSWORD: ResetPasswordState = {
  token: "",
  password: "",
  confirmPassword: "",
  userType: "student",
  isLoading: false,
  error: null,
  success: false,
};

const INITIAL_CHANGE_PASSWORD: ChangePasswordState = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
  isLoading: false,
  error: null,
  success: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      sessionStatus: "loading",

      // Sync session from NextAuth
      syncSession: (sessionData) => {
        if (sessionData?.user) {
          const user = sessionData.user as AuthUser;
          if (user.id && user.role) {
            set({
              user,
              isAuthenticated: true,
              sessionStatus: "authenticated",
            });
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            sessionStatus: "unauthenticated",
          });
        }
      },

      clearSession: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionStatus: "unauthenticated",
        });
      },

      // Computed getters
      getUserRole: () => get().user?.role || null,
      isAdmin: () => get().user?.role === USER_ROLES.ADMIN,
      isTeacher: () => get().user?.role === USER_ROLES.TEACHER,
      isStudent: () => get().user?.role === USER_ROLES.STUDENT,
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        // Don't persist sensitive data, only UI preferences if needed
      }),
    },
  ),
);

export const usePasswordStore = create<PasswordStore>((set, get) => ({
  // -------------------------------------------------------------------------
  // FORGOT PASSWORD
  // -------------------------------------------------------------------------
  forgotPassword: { ...INITIAL_FORGOT_PASSWORD },

  setForgotPasswordField: (field, value) => {
    set((state) => ({
      forgotPassword: {
        ...state.forgotPassword,
        [field]: value,
        error: null,
      },
    }));
  },

  submitForgotPassword: async () => {
    const { email, userType } = get().forgotPassword;

    set((state) => ({
      forgotPassword: {
        ...state.forgotPassword,
        isLoading: true,
        error: null,
        success: false,
      },
    }));

    try {
      const res = await fetch(API_ROUTES.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userType } as ForgotPasswordRequest),
      });

      const data = await res.json();

      if (data.success) {
        set((state) => ({
          forgotPassword: {
            ...state.forgotPassword,
            isLoading: false,
            success: true,
          },
        }));
        return true;
      } else {
        throw new Error(data.error || "Failed to send reset email");
      }
    } catch (error) {
      set((state) => ({
        forgotPassword: {
          ...state.forgotPassword,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to send reset email",
        },
      }));
      return false;
    }
  },

  resetForgotPassword: () => {
    set({ forgotPassword: { ...INITIAL_FORGOT_PASSWORD } });
  },

  // -------------------------------------------------------------------------
  // RESET PASSWORD
  // -------------------------------------------------------------------------
  resetPassword: { ...INITIAL_RESET_PASSWORD },

  setResetPasswordField: (field, value) => {
    set((state) => ({
      resetPassword: {
        ...state.resetPassword,
        [field]: value,
        error: null,
      },
    }));
  },

  submitResetPassword: async () => {
    const { token, password, confirmPassword, userType } = get().resetPassword;

    if (password !== confirmPassword) {
      set((state) => ({
        resetPassword: {
          ...state.resetPassword,
          error: "Passwords do not match",
        },
      }));
      return false;
    }

    set((state) => ({
      resetPassword: {
        ...state.resetPassword,
        isLoading: true,
        error: null,
        success: false,
      },
    }));

    try {
      const res = await fetch(API_ROUTES.AUTH.RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          userType,
        } as Omit<ResetPasswordRequest, "confirmPassword">),
      });

      const data = await res.json();

      if (data.success) {
        set((state) => ({
          resetPassword: {
            ...state.resetPassword,
            isLoading: false,
            success: true,
          },
        }));
        return true;
      } else {
        throw new Error(data.error || "Failed to reset password");
      }
    } catch (error) {
      set((state) => ({
        resetPassword: {
          ...state.resetPassword,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to reset password",
        },
      }));
      return false;
    }
  },

  resetResetPassword: () => {
    set({ resetPassword: { ...INITIAL_RESET_PASSWORD } });
  },

  // -------------------------------------------------------------------------
  // CHANGE PASSWORD
  // -------------------------------------------------------------------------
  changePassword: { ...INITIAL_CHANGE_PASSWORD },

  setChangePasswordField: (field, value) => {
    set((state) => ({
      changePassword: {
        ...state.changePassword,
        [field]: value,
        error: null,
      },
    }));
  },

  submitChangePassword: async () => {
    const { currentPassword, newPassword, confirmNewPassword } =
      get().changePassword;

    if (newPassword !== confirmNewPassword) {
      set((state) => ({
        changePassword: {
          ...state.changePassword,
          error: "Passwords do not match",
        },
      }));
      return false;
    }

    if (currentPassword === newPassword) {
      set((state) => ({
        changePassword: {
          ...state.changePassword,
          error: "New password must be different from current password",
        },
      }));
      return false;
    }

    set((state) => ({
      changePassword: {
        ...state.changePassword,
        isLoading: true,
        error: null,
        success: false,
      },
    }));

    try {
      const res = await fetch(API_ROUTES.AUTH.CHANGE_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        } as Omit<ChangePasswordRequest, "confirmNewPassword">),
      });

      const data = await res.json();

      if (data.success) {
        set((state) => ({
          changePassword: {
            ...state.changePassword,
            isLoading: false,
            success: true,
          },
        }));
        return true;
      } else {
        throw new Error(data.error || "Failed to change password");
      }
    } catch (error) {
      set((state) => ({
        changePassword: {
          ...state.changePassword,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to change password",
        },
      }));
      return false;
    }
  },

  resetChangePassword: () => {
    set({ changePassword: { ...INITIAL_CHANGE_PASSWORD } });
  },
}));

// Convenience hook
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isTeacher = useAuthStore((state) => state.isTeacher);
  const isStudent = useAuthStore((state) => state.isStudent);
  const getUserRole = useAuthStore((state) => state.getUserRole);
  const syncSession = useAuthStore((state) => state.syncSession);

  return {
    user,
    isAuthenticated,
    sessionStatus,
    isAdmin,
    isTeacher,
    isStudent,
    getUserRole,
    syncSession,
  };
}
