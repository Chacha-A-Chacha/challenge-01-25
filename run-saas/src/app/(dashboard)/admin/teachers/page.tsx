"use client";

import { useEffect, useState } from "react";
import { Eye, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Pagination } from "@/components/shared/Pagination";
import { TeacherDetailsModal } from "@/components/admin/TeacherDetailsModal";
import { DeactivateTeacherModal } from "@/components/admin/DeactivateTeacherModal";
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
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [teacherToDeactivate, setTeacherToDeactivate] =
    useState<TeacherWithCourse | null>(null);

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

  const handleOpenDeactivateModal = (teacher: TeacherWithCourse) => {
    setTeacherToDeactivate(teacher);
    setIsDeactivateModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!teacherToDeactivate) return;

    const success = await deactivateTeacher(teacherToDeactivate.id);

    if (success) {
      toast.success("Teacher deactivated successfully");
      setIsDeactivateModalOpen(false);
      setTeacherToDeactivate(null);
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
          <Badge
            variant={role === TEACHER_ROLES.HEAD ? "default" : "secondary"}
          >
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
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDeactivateModal(teacher);
              }}
              disabled={isDeleting}
            >
              <UserMinus className="h-4 w-4" />
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
            placeholder="Search by name or email..."
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

      {/* Deactivate Modal */}
      <DeactivateTeacherModal
        teacher={teacherToDeactivate}
        open={isDeactivateModalOpen}
        onOpenChange={setIsDeactivateModalOpen}
        onConfirm={handleDeactivate}
        isDeactivating={isDeleting}
      />
    </div>
  );
}
