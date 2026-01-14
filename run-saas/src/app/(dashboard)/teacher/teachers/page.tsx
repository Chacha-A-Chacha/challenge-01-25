"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  UserMinus,
  Users,
  Mail,
  Calendar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddTeacherModal } from "@/components/teacher/AddTeacherModal";
import { RemoveTeacherModal } from "@/components/teacher/RemoveTeacherModal";
import { useCourseStore } from "@/store";
import { useAuthStore } from "@/store/auth/auth-store";
import type { TeacherWithCourse } from "@/types";
import { TEACHER_ROLES } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getTeacherDisplayName = (teacher: TeacherWithCourse) => {
  return `${teacher.firstName} ${teacher.lastName}`;
};

export default function TeachersPage() {
  const { user } = useAuthStore();
  const { courses, loadCourses } = useCourseStore();

  const [teachers, setTeachers] = useState<TeacherWithCourse[]>([]);
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherWithCourse | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Get the head teacher's course
  const myCourse = courses.find((c) => c.id === user?.courseId);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (myCourse) {
      // Extract all teachers from the course
      const allTeachers: TeacherWithCourse[] = [
        // Head teacher
        {
          ...myCourse.headTeacher,
          course: myCourse,
          headCourse: myCourse,
        },
        // Additional teachers
        ...(myCourse.teachers?.filter((t) => t.id !== myCourse.headTeacherId) ||
          []),
      ];
      setTeachers(allTeachers);
      setIsLoading(false);
    }
  }, [myCourse]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRemove = async () => {
    if (!selectedTeacher) return;

    setIsRemoving(true);

    try {
      const response = await fetch(
        `/api/teacher/teachers/${selectedTeacher.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Teacher removed successfully");
        setIsRemoveModalOpen(false);
        setSelectedTeacher(null);
        // Reload courses to refresh the teachers list
        await loadCourses();
      } else {
        toast.error(result.error || "Failed to remove teacher");
      }
    } catch {
      toast.error("Failed to remove teacher");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddSuccess = async () => {
    // Reload courses to refresh the teachers list
    await loadCourses();
  };

  const columns: Column<TeacherWithCourse>[] = [
    {
      header: "Name",
      accessor: (teacher) => getTeacherDisplayName(teacher),
      cell: (_value: unknown, teacher: TeacherWithCourse) => (
        <div>
          <p className="font-medium">{getTeacherDisplayName(teacher)}</p>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
      ),
      className: "min-w-[200px]",
    },
    {
      header: "Role",
      accessor: "role",
      cell: (value) => (
        <Badge
          variant={value === TEACHER_ROLES.HEAD ? "default" : "secondary"}
          className={cn(
            value === TEACHER_ROLES.HEAD &&
              "bg-emerald-600 hover:bg-emerald-700",
          )}
        >
          {value === TEACHER_ROLES.HEAD ? "Head Teacher" : "Additional"}
        </Badge>
      ),
      className: "min-w-[120px]",
    },
    {
      header: "Joined",
      accessor: "createdAt",
      cell: (value) => new Date(value as string).toLocaleDateString(),
      className: "min-w-[100px]",
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, teacher) => (
        <div className="flex gap-2">
          {teacher.role === TEACHER_ROLES.ADDITIONAL && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTeacher(teacher);
                setIsRemoveModalOpen(true);
              }}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
          {teacher.role === TEACHER_ROLES.HEAD && (
            <span className="text-sm text-muted-foreground italic">
              You (Head)
            </span>
          )}
        </div>
      ),
      className: "min-w-[150px]",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

  const additionalTeachersCount = teachers.filter(
    (t) => t.role === TEACHER_ROLES.ADDITIONAL,
  ).length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Teachers
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage additional teachers for your course
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Stats - 2 columns on mobile, 3 on desktop */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              <div className="text-2xl font-bold">{teachers.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">1</div>
            </div>
            <p className="text-xs text-muted-foreground">Head Teacher</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold">
                {additionalTeachersCount}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Additional Teachers</p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      {viewMode === "table" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">
              {teachers.length} Teacher{teachers.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <DataTable
                  data={teachers}
                  columns={columns}
                  emptyMessage="No teachers found"
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Mobile Card View */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              {teachers.length} teacher{teachers.length !== 1 ? "s" : ""}
            </p>
          </div>

          {teachers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                No teachers found
              </CardContent>
            </Card>
          ) : (
            <>
              {teachers.map((teacher) => {
                const isCurrentUser = teacher.role === TEACHER_ROLES.HEAD;

                return (
                  <Card
                    key={teacher.id}
                    className={cn(
                      "transition-shadow",
                      isCurrentUser && "border-emerald-200 bg-emerald-50/50",
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Name and Role */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                              <h3 className="font-semibold text-base truncate">
                                {getTeacherDisplayName(teacher)}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{teacher.email}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              teacher.role === TEACHER_ROLES.HEAD
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              "flex-shrink-0",
                              teacher.role === TEACHER_ROLES.HEAD &&
                                "bg-emerald-600 hover:bg-emerald-700",
                            )}
                          >
                            {teacher.role === TEACHER_ROLES.HEAD
                              ? "Head"
                              : "Additional"}
                          </Badge>
                        </div>

                        {/* Joined Date */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            Joined:{" "}
                            {new Date(teacher.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {teacher.role === TEACHER_ROLES.ADDITIONAL ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsRemoveModalOpen(true);
                            }}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove Teacher
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center py-2 text-sm text-emerald-700 font-medium">
                            <Shield className="mr-2 h-4 w-4" />
                            You (Head Teacher)
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTeacherModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />

      <RemoveTeacherModal
        teacher={selectedTeacher}
        open={isRemoveModalOpen}
        onOpenChange={setIsRemoveModalOpen}
        onConfirm={handleRemove}
        isRemoving={isRemoving}
      />
    </div>
  );
}
