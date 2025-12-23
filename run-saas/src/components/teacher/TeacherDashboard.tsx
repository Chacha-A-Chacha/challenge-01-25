"use client";

import { useAuthStore } from "@/store/auth/auth-store";
import { HeadTeacherDashboard } from "./HeadTeacherDashboard";
import { TEACHER_ROLES } from "@/types";

export function TeacherDashboard() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  // Check if head teacher
  const isHeadTeacher = user.teacherRole === TEACHER_ROLES.HEAD;

  if (isHeadTeacher) {
    return <HeadTeacherDashboard />;
  }

  // Additional teacher dashboard - placeholder for now
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Additional Teacher Dashboard</h2>
        <p className="text-muted-foreground">
          Dashboard for additional teachers coming soon...
        </p>
      </div>
    </div>
  );
}
