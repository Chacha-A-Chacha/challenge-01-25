"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Mail,
  Hash,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Pagination } from "@/components/shared/Pagination";
import { formatTimeForDisplay } from "@/lib/validations";
import {
  useStudents,
  useStudentFilters,
  type StudentWithSessions,
} from "@/store/teacher/student-store";
import { useClassStore } from "@/store/teacher/class-store";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

export default function StudentsPage() {
  const router = useRouter();
  const { students, filteredStudents, isLoading, loadStudents } = useStudents();

  const { filters, setFilters } = useStudentFilters();
  const { classes, loadClasses } = useClassStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.classId]);

  // Build class filter options
  const classOptions = [
    { label: "All Classes", value: "all" },
    ...classes.map((cls) => ({
      label: cls.name,
      value: cls.id,
    })),
  ];

  const handleViewDetails = (student: StudentWithSessions) => {
    router.push(`/teacher/students/${student.id}`);
  };

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const columns: Column<StudentWithSessions>[] = [
    {
      header: "Student Number",
      accessor: "studentNumber",
      cell: (value) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
          {value}
        </code>
      ),
      className: "min-w-[120px]",
    },
    {
      header: "Name",
      accessor: (student) =>
        [student.surname, student.firstName, student.lastName]
          .filter(Boolean)
          .join(" "),
      cell: (value) => <span className="font-medium">{value}</span>,
      className: "min-w-[180px]",
    },
    {
      header: "Email",
      accessor: "email",
      className: "min-w-[200px]",
    },
    {
      header: "Class",
      accessor: (student) => student.class?.name || "N/A",
      className: "min-w-[120px]",
    },
    {
      header: "Saturday",
      accessor: (student) =>
        student.saturdaySession
          ? `${formatTimeForDisplay(student.saturdaySession.startTime)} - ${formatTimeForDisplay(student.saturdaySession.endTime)}`
          : "Not assigned",
      cell: (value) => (
        <span
          className={cn(
            "text-sm",
            value === "Not assigned" && "text-muted-foreground italic",
          )}
        >
          {value}
        </span>
      ),
      className: "min-w-[140px]",
    },
    {
      header: "Sunday",
      accessor: (student) =>
        student.sundaySession
          ? `${formatTimeForDisplay(student.sundaySession.startTime)} - ${formatTimeForDisplay(student.sundaySession.endTime)}`
          : "Not assigned",
      cell: (value) => (
        <span
          className={cn(
            "text-sm",
            value === "Not assigned" && "text-muted-foreground italic",
          )}
        >
          {value}
        </span>
      ),
      className: "min-w-[140px]",
    },
    {
      header: "Status",
      accessor: () => null,
      cell: (_value, student) => {
        const hasAllSessions = student.saturdaySession && student.sundaySession;
        return (
          <Badge
            variant={hasAllSessions ? "default" : "secondary"}
            className={cn(
              hasAllSessions && "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            {hasAllSessions ? "Assigned" : "Pending"}
          </Badge>
        );
      },
      className: "min-w-[100px]",
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, student) => (
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(student);
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      ),
      className: "min-w-[100px]",
    },
  ];

  const totalStudents = students.length;
  const studentsWithSessions = students.filter(
    (s) => s.saturdaySession && s.sundaySession,
  ).length;
  const studentsWithoutSessions = totalStudents - studentsWithSessions;

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Students
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage students in your course
        </p>
      </div>

      {/* Stats - 2 columns on mobile, 4 on desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <div className="text-2xl font-bold">{totalStudents}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {studentsWithSessions}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Fully Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">
                {studentsWithoutSessions}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Missing Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">{classes.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search by name, email, or student number..."
            />
            <FilterSelect
              value={filters.classId}
              options={classOptions}
              onChange={(value) => setFilters({ classId: value })}
              placeholder="Filter by class"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          {viewMode === "table" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">
                  {filteredStudents.length} Student
                  {filteredStudents.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-[1000px]">
                    <DataTable
                      data={paginatedStudents}
                      columns={columns}
                      onRowClick={handleViewDetails}
                      emptyMessage="No students found"
                    />
                  </div>
                </ScrollArea>

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
                  {filteredStudents.length} student
                  {filteredStudents.length !== 1 ? "s" : ""}
                </p>
                {totalPages > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                )}
              </div>

              {paginatedStudents.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                    No students found
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedStudents.map((student) => {
                    const hasAllSessions =
                      student.saturdaySession && student.sundaySession;
                    const studentName = [
                      student.surname,
                      student.firstName,
                      student.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <Card
                        key={student.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleViewDetails(student)}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Name and Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <GraduationCap className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                  <h3 className="font-semibold text-base truncate">
                                    {studentName}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Hash className="h-3 w-3 flex-shrink-0" />
                                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
                                    {student.studentNumber}
                                  </code>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  hasAllSessions ? "default" : "secondary"
                                }
                                className={cn(
                                  "flex-shrink-0",
                                  hasAllSessions &&
                                    "bg-emerald-600 hover:bg-emerald-700",
                                )}
                              >
                                {hasAllSessions ? "Assigned" : "Pending"}
                              </Badge>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{student.email}</span>
                            </div>

                            {/* Class */}
                            <div className="flex items-center gap-2 text-sm pt-2 border-t">
                              <Users className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                              <span className="font-medium">
                                {student.class?.name || "No class assigned"}
                              </span>
                            </div>

                            {/* Sessions */}
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  <span>Saturday</span>
                                </div>
                                {student.saturdaySession ? (
                                  <span className="font-medium text-xs">
                                    {formatTimeForDisplay(
                                      student.saturdaySession.startTime,
                                    )}{" "}
                                    -{" "}
                                    {formatTimeForDisplay(
                                      student.saturdaySession.endTime,
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Not assigned
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  <span>Sunday</span>
                                </div>
                                {student.sundaySession ? (
                                  <span className="font-medium text-xs">
                                    {formatTimeForDisplay(
                                      student.sundaySession.startTime,
                                    )}{" "}
                                    -{" "}
                                    {formatTimeForDisplay(
                                      student.sundaySession.endTime,
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Not assigned
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(student);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
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
    </div>
  );
}
