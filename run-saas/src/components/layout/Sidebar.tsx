// components/layout/Sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store";
import { USER_ROLES, TEACHER_ROLES } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  Calendar,
  ClipboardList,
  UserPlus,
  FileCheck,
  Settings,
  Menu,
  BookOpen,
  Clock,
  QrCode,
  CalendarDays,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  // Type-safe role checks using constants
  const isAdmin = user.role === USER_ROLES.ADMIN;
  const isHeadTeacher =
    user.role === USER_ROLES.TEACHER && user.teacherRole === TEACHER_ROLES.HEAD;
  const isAdditionalTeacher =
    user.role === USER_ROLES.TEACHER &&
    user.teacherRole === TEACHER_ROLES.ADDITIONAL;
  const isStudent = user.role === USER_ROLES.STUDENT;

  // Admin Navigation
  const adminNav: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Courses", href: "/admin/courses", icon: GraduationCap },
    { label: "Teachers", href: "/admin/teachers", icon: Users },
    { label: "Classes", href: "/admin/classes", icon: School },
    { label: "Attendance", href: "/admin/attendance", icon: ClipboardList },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  // Head Teacher Navigation
  const headTeacherNav: NavItem[] = [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Teachers", href: "/teacher/teachers", icon: Users },
    { label: "Classes", href: "/teacher/classes", icon: School },
    { label: "Students", href: "/teacher/students", icon: UserPlus },
    { label: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
    { label: "Reassignments", href: "/teacher/reassignments", icon: BookOpen },
    { label: "Registrations", href: "/teacher/registrations", icon: FileCheck },
    { label: "Settings", href: "/teacher/settings", icon: Settings },
  ];

  // Additional Teacher Navigation
  const additionalTeacherNav: NavItem[] = [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Students", href: "/teacher/students", icon: UserPlus },
    { label: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
    { label: "Reassignments", href: "/teacher/reassignments", icon: BookOpen },
    { label: "Sessions", href: "/teacher/sessions", icon: Clock },
    { label: "Settings", href: "/teacher/settings", icon: Settings },
  ];

  // Student Navigation
  const studentNav: NavItem[] = [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "My Schedule", href: "/student/schedule", icon: CalendarDays },
    { label: "QR Code", href: "/student/qr", icon: QrCode },
    { label: "Attendance", href: "/student/attendance", icon: ClipboardList },
    { label: "Reassignment", href: "/student/reassignment", icon: BookOpen },
    { label: "Profile", href: "/student/profile", icon: UserCog },
  ];

  // Select navigation based on role
  const navItems = isAdmin
    ? adminNav
    : isHeadTeacher
      ? headTeacherNav
      : isAdditionalTeacher
        ? additionalTeacherNav
        : studentNav;

  // Determine portal colors based on role
  const portalConfig = isAdmin
    ? { color: "emerald", label: "Admin Portal" }
    : isStudent
      ? { color: "blue", label: "Student Portal" }
      : { color: "emerald", label: isHeadTeacher ? "Head Teacher" : "Teacher" };

  const isActive = (href: string) => {
    // Exact match for dashboard routes
    if (href === "/admin" || href === "/teacher" || href === "/student") {
      return pathname === href;
    }
    // Prefix match for sub-routes
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              portalConfig.color === "emerald"
                ? "bg-emerald-600"
                : "bg-blue-600",
            )}
          >
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Weekend Academy</h2>
            <p
              className={cn(
                "text-xs font-medium",
                portalConfig.color === "emerald"
                  ? "text-emerald-700"
                  : "text-blue-700",
              )}
            >
              {portalConfig.label}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    active &&
                      portalConfig.color === "emerald" &&
                      "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
                    active &&
                      portalConfig.color === "blue" &&
                      "bg-blue-100 text-blue-900 hover:bg-blue-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      active && portalConfig.color === "emerald"
                        ? "text-emerald-700"
                        : active && portalConfig.color === "blue"
                          ? "text-blue-700"
                          : "text-gray-600",
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center",
              portalConfig.color === "emerald"
                ? "bg-emerald-100"
                : "bg-blue-100",
            )}
          >
            <span
              className={cn(
                "font-semibold text-sm",
                portalConfig.color === "emerald"
                  ? "text-emerald-700"
                  : "text-blue-700",
              )}
            >
              {user.email?.charAt(0).toUpperCase() ||
                user.firstName?.charAt(0).toUpperCase() ||
                "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.firstName || user.email || "User"}
            </p>
            <p className="text-xs text-gray-600">
              {isAdmin
                ? "Administrator"
                : isHeadTeacher
                  ? "Head Teacher"
                  : isAdditionalTeacher
                    ? "Teacher"
                    : "Student"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
