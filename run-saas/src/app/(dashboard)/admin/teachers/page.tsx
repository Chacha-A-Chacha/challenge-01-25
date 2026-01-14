"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  UserMinus,
  Users,
  UserCheck,
  UserPlus,
  GraduationCap,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [teacherToDeactivate, setTeacherToDeactivate] =
    useState<TeacherWithCourse | null>(null);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      className: "min-w-[200px]",
    },
    {
      header: "Role",
      accessor: "role",
      cell: (value: unknown) => {
        const role = value as string;
        return (
          <Badge
            variant={role === TEACHER_ROLES.HEAD ? "default" : "secondary"}
            className={
              role === TEACHER_ROLES.HEAD
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }
          >
            {role === TEACHER_ROLES.HEAD ? "Head Teacher" : "Additional"}
          </Badge>
        );
      },
      className: "min-w-[120px]",
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
      className: "min-w-[150px]",
    },
    {
      header: "Joined",
      accessor: "createdAt",
      cell: (value) => new Date(value).toLocaleDateString(),
      className: "min-w-[100px]",
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, teacher) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
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
      className: "min-w-[120px]",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Teachers
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage teachers and view their course assignments
          </p>
        </div>
      </div>

      {/* Stats - Mobile Optimized */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
              <UserCheck className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">
                {teachers.filter((t) => t.role === TEACHER_ROLES.HEAD).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Head Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold">
                {
                  teachers.filter((t) => t.role === TEACHER_ROLES.ADDITIONAL)
                    .length
                }
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Additional</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">
                {
                  teachers.filter(
                    (t) => t.course !== null || t.headCourse !== null,
                  ).length
                }
              </div>
            </div>
            <p className="text-xs text-muted-foreground">With Course</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <SearchInput
                value={filters.search}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, search: value }))
                }
                placeholder="Search by name or email..."
              />
            </div>
            <FilterSelect
              label="Role"
              value={filters.role}
              options={roleOptions}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, role: value }))
              }
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={statusOptions}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading teachers...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          {viewMode === "table" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">
                  {filteredTeachers.length} Teacher
                  {filteredTeachers.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={paginatedTeachers}
                  columns={columns}
                  onRowClick={handleViewDetails}
                  emptyMessage="No teachers found"
                />

                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mobile Card View */}
          {viewMode === "cards" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                  {filteredTeachers.length} teacher
                  {filteredTeachers.length !== 1 ? "s" : ""}
                </p>
              </div>

              {paginatedTeachers.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                    No teachers found
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedTeachers.map((teacher) => {
                    const course =
                      teacher.role === TEACHER_ROLES.HEAD
                        ? teacher.headCourse
                        : teacher.course;
                    const courseName = course?.name || "No course";

                    return (
                      <Card
                        key={teacher.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleViewDetails(teacher)}
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
                                  <span className="truncate">
                                    {teacher.email}
                                  </span>
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

                            {/* Course Info */}
                            <div className="flex items-center gap-2 text-sm">
                              <GraduationCap className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span
                                className={
                                  courseName === "No course"
                                    ? "text-muted-foreground"
                                    : "font-medium"
                                }
                              >
                                {courseName}
                              </span>
                            </div>

                            {/* Joined Date */}
                            <div className="text-xs text-muted-foreground">
                              Joined:{" "}
                              {new Date(teacher.createdAt).toLocaleDateString()}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(teacher);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Button>
                              {teacher.role === TEACHER_ROLES.ADDITIONAL && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Mobile Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-2">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
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
