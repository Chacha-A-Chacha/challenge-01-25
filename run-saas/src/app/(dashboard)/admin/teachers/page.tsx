"use client";

import { useEffect, useState } from "react";
import { Eye, Trash2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Pagination } from "@/components/shared/Pagination";
import { TeacherDetailsModal } from "@/components/admin/TeacherDetailsModal";
import { useTeacherStore } from "@/store/admin/teacher-store";
import type { TeacherWithCourse } from "@/types";
import { TEACHER_ROLES } from "@/types";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const roleOptions = [
  { label: "All Roles", value: "all" },
  { label: "Head Teachers", value: TEACHER_ROLES.HEAD },
  { label: "Additional Teachers", value: TEACHER_ROLES.ADDITIONAL },
];

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "With Course", value: "with_course" },
  { label: "No Course", value: "no_course" },
];

const getTeacherDisplayName = (teacher: TeacherWithCourse) => {
  return `${teacher.firstName} ${teacher.lastName}`;
};

export default function TeachersPage() {
  const {
    teachers,
    selectedTeacher,
    isLoading,
    isDeleting,
    selectTeacher,
    loadTeachers,
    deactivateTeacher,
  } = useTeacherStore();

  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // Filter teachers
  const filteredTeachers = teachers.filter((teacher) => {
    const searchTerm = filters.search.toLowerCase();
    const teacherName =
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const matchesSearch =
      teacher.email.toLowerCase().includes(searchTerm) ||
      teacherName.includes(searchTerm);

    const matchesRole = filters.role === "all" || teacher.role === filters.role;

    const hasCourse = teacher.course !== null || teacher.headCourse !== null;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "with_course" && hasCourse) ||
      (filters.status === "no_course" && !hasCourse);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTeachers = filteredTeachers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.role, filters.status]);

  const handleViewDetails = (teacher: TeacherWithCourse) => {
    selectTeacher(teacher);
    setIsDetailsModalOpen(true);
  };

  const handleDeactivate = async (teacher: TeacherWithCourse) => {
    // Prevent deactivation of head teachers
    if (teacher.role === TEACHER_ROLES.HEAD) {
      toast.error(
        "Cannot deactivate head teacher. Please replace the head teacher first in the course management section.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${getTeacherDisplayName(teacher)}? This will remove them from their course.`,
    );

    if (!confirmed) return;

    const success = await deactivateTeacher(teacher.id);

    if (success) {
      toast.success("Teacher deactivated successfully");
    } else {
      toast.error("Failed to deactivate teacher");
    }
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
    },
    {
      header: "Role",
      accessor: "role",
      cell: (value: unknown) => {
        const role = value as string;
        return (
          <Badge variant={role === TEACHER_ROLES.HEAD ? "success" : "default"}>
            {role === TEACHER_ROLES.HEAD ? "Head Teacher" : "Additional"}
          </Badge>
        );
      },
    },
    {
      header: "Course",
      accessor: (teacher) => {
        const course =
          teacher.role === TEACHER_ROLES.HEAD
            ? teacher.headCourse
            : teacher.course;
        return course?.name || "No course";
      },
      cell: (value: unknown) => {
        const courseName = String(value);
        return (
          <span
            className={
              courseName === "No course" ? "text-muted-foreground" : ""
            }
          >
            {courseName}
          </span>
        );
      },
    },
    {
      header: "Classes",
      accessor: (teacher) => {
        if (teacher.role === TEACHER_ROLES.HEAD && teacher.headCourse) {
          return teacher.headCourse.classes?.length || 0;
        }
        return "-";
      },
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
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(teacher);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {teacher.role === TEACHER_ROLES.ADDITIONAL && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeactivate(teacher);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teachers and view their course assignments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">Total Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {teachers.filter((t) => t.role === TEACHER_ROLES.HEAD).length}
            </div>
            <p className="text-xs text-muted-foreground">Head Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                teachers.filter((t) => t.role === TEACHER_ROLES.ADDITIONAL)
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Additional Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                teachers.filter(
                  (t) => t.course !== null || t.headCourse !== null,
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">With Course</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchInput
            value={filters.search}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, search: value }))
            }
            placeholder="Search by email..."
          />
        </div>
        <FilterSelect
          value={filters.role}
          options={roleOptions}
          onChange={(value) => setFilters((prev) => ({ ...prev, role: value }))}
          placeholder="Filter by role"
        />
        <FilterSelect
          value={filters.status}
          options={statusOptions}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
          placeholder="Filter by status"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading teachers...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            data={paginatedTeachers}
            columns={columns}
            onRowClick={handleViewDetails}
            emptyMessage="No teachers found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Details Modal */}
      <TeacherDetailsModal
        teacher={selectedTeacher}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
    </div>
  );
}
