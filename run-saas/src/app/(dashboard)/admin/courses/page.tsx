"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: COURSE_STATUS.ACTIVE },
  { label: "Inactive", value: COURSE_STATUS.INACTIVE },
  { label: "Completed", value: COURSE_STATUS.COMPLETED },
];

const getStatusBadgeVariant = (status: CourseStatus) => {
  switch (status) {
    case COURSE_STATUS.ACTIVE:
      return "success";
    case COURSE_STATUS.INACTIVE:
      return "warning";
    case COURSE_STATUS.COMPLETED:
      return "secondary";
    default:
      return "default";
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

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredCourses = getFilteredCourses();
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const columns: Column<CourseWithDetails>[] = [
    {
      header: "Course Name",
      accessor: "name",
      className: "font-medium",
    },
    {
      header: "Head Teacher",
      accessor: (row) => row.headTeacher.email,
    },
    {
      header: "Status",
      accessor: "status",
      cell: (value: unknown) => {
        const status = value as CourseStatus;
        return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
      },
    },
    {
      header: "Classes",
      accessor: (row) => row._count?.classes || 0,
    },
    {
      header: "Teachers",
      accessor: (row) => row._count?.teachers || 0,
    },
    {
      header: "Created",
      accessor: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            Manage all courses and their head teachers
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search by course name or teacher email..."
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredCourses.length} Course
            {filteredCourses.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCourses}
            columns={columns}
            onRowClick={(course) => router.push(`/admin/courses/${course.id}`)}
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

      {/* Create Course Modal */}
      <CreateCourseModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
