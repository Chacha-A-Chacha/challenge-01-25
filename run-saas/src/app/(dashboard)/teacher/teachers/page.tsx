"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AddTeacherModal } from "@/components/teacher/AddTeacherModal";
import { RemoveTeacherModal } from "@/components/teacher/RemoveTeacherModal";
import { useCourseStore } from "@/store";
import { useAuthStore } from "@/store/auth/auth-store";
import type { TeacherWithCourse } from "@/types";
import { TEACHER_ROLES } from "@/types";
import { toast } from "sonner";

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
    } catch (error) {
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
      header: "Email",
      accessor: "email",
      cell: (value) => <span className="font-medium">{value}</span>,
    },
    {
      header: "Role",
      accessor: "role",
      cell: (value) => (
        <Badge variant={value === TEACHER_ROLES.HEAD ? "success" : "default"}>
          {value === TEACHER_ROLES.HEAD ? "Head Teacher" : "Additional"}
        </Badge>
      ),
    },
    {
      header: "Joined",
      accessor: "createdAt",
      cell: (value) => new Date(value).toLocaleDateString(),
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, teacher) => (
        <div className="flex gap-2">
          {teacher.role === TEACHER_ROLES.ADDITIONAL && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTeacher(teacher);
                setIsRemoveModalOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {teacher.role === TEACHER_ROLES.HEAD && (
            <span className="text-sm text-muted-foreground italic">
              You (Head)
            </span>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

  const additionalTeachersCount = teachers.filter(
    (t) => t.role === TEACHER_ROLES.ADDITIONAL,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage additional teachers for your course
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">Total Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Head Teacher</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{additionalTeachersCount}</div>
            <p className="text-xs text-muted-foreground">Additional Teachers</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        data={teachers}
        columns={columns}
        emptyMessage="No teachers found"
      />

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
