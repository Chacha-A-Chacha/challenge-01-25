"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { formatTimeForDisplay } from "@/lib/validations";
import {
  useStudents,
  useStudentFilters,
  type StudentWithSessions,
} from "@/store/teacher/student-store";
import { useClassStore } from "@/store/teacher/class-store";

export default function StudentsPage() {
  const router = useRouter();
  const { students, filteredStudents, isLoading, loadStudents } = useStudents();

  const { filters, setFilters } = useStudentFilters();
  const { classes, loadClasses } = useClassStore();

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

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

  const columns: Column<StudentWithSessions>[] = [
    {
      header: "Student Number",
      accessor: "studentNumber",
      cell: (value) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
          {value}
        </code>
      ),
    },
    {
      header: "Name",
      accessor: (student) =>
        [student.surname, student.firstName, student.lastName]
          .filter(Boolean)
          .join(" "),
      cell: (value) => <span className="font-medium">{value}</span>,
    },
    {
      header: "Email",
      accessor: "email",
    },
    {
      header: "Class",
      accessor: (student) => student.class?.name || "N/A",
    },
    {
      header: "Status",
      accessor: () => null,
      cell: (_value, student) => {
        const hasAllSessions = student.saturdaySession && student.sundaySession;
        return (
          <Badge variant={hasAllSessions ? "success" : "warning"}>
            {hasAllSessions ? "Assigned" : "Pending"}
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, student) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(student);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const totalStudents = students.length;
  const studentsWithSessions = students.filter(
    (s) => s.saturdaySession && s.sundaySession,
  ).length;
  const studentsWithoutSessions = totalStudents - studentsWithSessions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            View and manage students in your course
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalStudents}</div>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {studentsWithSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Fully Assigned (Sessions)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {studentsWithoutSessions}
            </div>
            <p className="text-xs text-muted-foreground">Missing Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">Total Classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters({ search: value })}
            placeholder="Search by name, email, or student number..."
          />
        </div>
        <FilterSelect
          value={filters.classId}
          options={classOptions}
          onChange={(value) => setFilters({ classId: value })}
          placeholder="Filter by class"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        </div>
      ) : (
        <DataTable
          data={filteredStudents}
          columns={columns}
          onRowClick={handleViewDetails}
          emptyMessage="No students found"
        />
      )}
    </div>
  );
}
