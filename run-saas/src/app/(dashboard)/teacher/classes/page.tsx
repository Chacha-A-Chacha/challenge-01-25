"use client";

import { useEffect, useState } from "react";
import { Plus, School, Users, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { useClasses, useClassFilters } from "@/store/teacher/class-store";
import { usePermissions } from "@/hooks";
import { ClassCard } from "@/components/teacher/classes/ClassCard";
import { CreateClassModal } from "@/components/teacher/classes/CreateClassModal";

export default function ClassesPage() {
  const { isHeadTeacher } = usePermissions();
  const { classes, filteredClasses, isLoading, loadClasses } = useClasses();
  const { filters, setFilters } = useClassFilters();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Sort options
  const sortOptions = [
    { label: "Newest First", value: "createdAt-desc" },
    { label: "Oldest First", value: "createdAt-asc" },
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "Capacity (High-Low)", value: "capacity-desc" },
    { label: "Capacity (Low-High)", value: "capacity-asc" },
  ];

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-") as [
      "name" | "capacity" | "createdAt",
      "asc" | "desc",
    ];
    setFilters({ sortBy, sortOrder });
  };

  // Stats calculations
  const totalClasses = classes.length;
  const totalCapacity = classes.reduce((sum, cls) => sum + cls.capacity, 0);
  const totalStudents = classes.reduce(
    (sum, cls) => sum + (cls._count?.students || cls.students?.length || 0),
    0,
  );
  const totalSessions = classes.reduce(
    (sum, cls) => sum + (cls._count?.sessions || cls.sessions?.length || 0),
    0,
  );
  const utilizationRate =
    totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Classes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isHeadTeacher
                ? "Manage classes and sessions for your course"
                : "View classes and sessions in your course"}
            </p>
          </div>
          {isHeadTeacher && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          )}
        </div>
      </div>

      {/* Stats - 2 columns on mobile, 4 on desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <School className="h-4 w-4 text-emerald-600" />
              <div className="text-2xl font-bold">{totalClasses}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold">{totalStudents}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">{totalSessions}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-4 w-4 text-orange-600" />
              <div className="text-2xl font-bold">{utilizationRate}%</div>
            </div>
            <p className="text-xs text-muted-foreground">Utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Search & Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search classes by name..."
            />
            <FilterSelect
              value={`${filters.sortBy}-${filters.sortOrder}`}
              options={sortOptions}
              onChange={handleSortChange}
              placeholder="Sort by"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <School className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No classes found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filters.search
                ? "No classes match your search criteria."
                : "Get started by creating your first class."}
            </p>
            {isHeadTeacher && !filters.search && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              isHeadTeacher={isHeadTeacher}
            />
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      <CreateClassModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
