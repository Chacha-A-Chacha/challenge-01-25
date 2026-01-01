"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    onOpenChange(open);
  };

  // Validate password strength
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  // Calculate password strength
  const getPasswordStrength = (password: string): {
    score: number;
    label: string;
    color: string;
  } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2)
      return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4)
      return { score, label: "Medium", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});

    // Validate inputs
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      handleOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);

      // If current password is incorrect, set the error
      if (errorMessage.toLowerCase().includes("incorrect")) {
        setErrors({ currentPassword: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update your password to keep your account secure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={errors.currentPassword ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={errors.newPassword ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.newPassword}
              </p>
            )}
            {newPassword && !errors.newPassword && passwordStrength && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Password strength:
                  </span>
                  <span className="font-medium">{passwordStrength.label}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Password must:
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                Be at least 8 characters long
              </li>
              <li className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                Include uppercase and lowercase letters
              </li>
              <li className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                Include at least one number
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
