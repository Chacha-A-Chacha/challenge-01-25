"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, GraduationCap, Users, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Pagination } from "@/components/shared/Pagination";
import { DataTable, Column } from "@/components/shared/DataTable";
import { CreateCourseModal } from "@/components/admin/CreateCourseModal";
import { useCourseStore } from "@/store";
import type { CourseWithDetails, CourseStatus } from "@/types";
import { COURSE_STATUS } from "@/types";
import { cn } from "@/lib/utils";

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: COURSE_STATUS.ACTIVE },
  { label: "Inactive", value: COURSE_STATUS.INACTIVE },
  { label: "Completed", value: COURSE_STATUS.COMPLETED },
];

const getStatusBadgeVariant = (
  status: CourseStatus,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case COURSE_STATUS.ACTIVE:
      return "default";
    case COURSE_STATUS.INACTIVE:
      return "secondary";
    case COURSE_STATUS.COMPLETED:
      return "outline";
    default:
      return "secondary";
  }
};

const getStatusColor = (status: CourseStatus) => {
  switch (status) {
    case COURSE_STATUS.ACTIVE:
      return "text-emerald-600";
    case COURSE_STATUS.INACTIVE:
      return "text-yellow-600";
    case COURSE_STATUS.COMPLETED:
      return "text-gray-600";
    default:
      return "text-muted-foreground";
  }
};

export default function CoursesPage() {
  const router = useRouter();
  const {
    courses,
    filters,
    pagination,
    isLoading,
    loadCourses,
    setFilters,
    setPagination,
    getFilteredCourses,
  } = useCourseStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredCourses = getFilteredCourses();
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const columns: Column<CourseWithDetails>[] = [
    {
      header: "Course Name",
      accessor: "name",
      className: "font-medium min-w-[200px]",
    },
    {
      header: "Head Teacher",
      accessor: (row) =>
        `${row.headTeacher.firstName} ${row.headTeacher.lastName}`,
      className: "min-w-[180px]",
    },
    {
      header: "Status",
      accessor: "status",
      cell: (value: unknown) => {
        const status = value as CourseStatus;
        return (
          <Badge
            variant={getStatusBadgeVariant(status)}
            className={getStatusColor(status)}
          >
            {status}
          </Badge>
        );
      },
      className: "min-w-[100px]",
    },
    {
      header: "Classes",
      accessor: (row) => row._count?.classes || 0,
      className: "min-w-[80px]",
    },
    {
      header: "Teachers",
      accessor: (row) => row._count?.teachers || 0,
      className: "min-w-[80px]",
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, row) => (
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/courses/${row.id}`);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      ),
      className: "min-w-[120px]",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Courses
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all courses and their head teachers
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 items-end">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search courses or teachers..."
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={statusOptions}
              onChange={(value) =>
                setFilters({ status: value as CourseStatus | "all" })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View */}
      {viewMode === "table" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">
              {filteredCourses.length} Course
              {filteredCourses.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredCourses}
              columns={columns}
              onRowClick={(course) =>
                router.push(`/admin/courses/${course.id}`)
              }
              emptyMessage={
                isLoading
                  ? "Loading courses..."
                  : "No courses found. Create your first course to get started."
              }
            />

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={totalPages}
                  onPageChange={(page) => setPagination({ page })}
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
              {filteredCourses.length} course
              {filteredCourses.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                Loading courses...
              </CardContent>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                No courses found. Create your first course to get started.
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredCourses.map((course) => (
                <Card
                  key={course.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Course Name and Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <h3 className="font-semibold text-base truncate">
                              {course.name}
                            </h3>
                          </div>
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(course.status)}
                          className={cn(
                            "flex-shrink-0",
                            getStatusColor(course.status),
                          )}
                        >
                          {course.status}
                        </Badge>
                      </div>

                      {/* Head Teacher */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Head: {course.headTeacher.firstName}{" "}
                          {course.headTeacher.lastName}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <School className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">
                            {course._count?.classes || 0}
                          </span>
                          <span className="text-muted-foreground">Classes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">
                            {course._count?.teachers || 0}
                          </span>
                          <span className="text-muted-foreground">
                            Teachers
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/courses/${course.id}`);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="pt-2">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={totalPages}
                    onPageChange={(page) => setPagination({ page })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
