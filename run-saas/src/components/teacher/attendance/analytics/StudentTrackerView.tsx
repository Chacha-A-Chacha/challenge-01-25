"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useStudentTracker } from "@/store/teacher/attendance-analytics-store";
import { DateRangePicker } from "@/components/admin/attendance/DateRangePicker";

export function StudentTrackerView() {
  const {
    searchResults,
    isSearching,
    selectedStudent,
    selectedStudentId,
    isLoadingStudent,
    dateRange,
    searchStudents,
    loadStudentHistory,
    clearSearchResults,
  } = useStudentTracker();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      searchStudents(searchQuery);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    loadStudentHistory(studentId, dateRange.startDate, dateRange.endDate);
    clearSearchResults();
    setSearchQuery("");
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    if (selectedStudentId) {
      loadStudentHistory(selectedStudentId, startDate, endDate);
    }
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 80) {
      return <Badge className="bg-green-600">{rate}%</Badge>;
    }
    if (rate >= 60) {
      return <Badge variant="secondary">{rate}%</Badge>;
    }
    return <Badge variant="destructive">{rate}%</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "PRESENT") {
      return <Badge className="bg-green-600">Present</Badge>;
    }
    if (status === "ABSENT") {
      return <Badge variant="destructive">Absent</Badge>;
    }
    return <Badge variant="secondary">Wrong Session</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Student Tracker</h3>
            <p className="text-sm text-muted-foreground">
              Search and view individual student attendance
            </p>
          </div>
          {selectedStudent && (
            <div className="w-full sm:w-auto">
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
          )}
        </div>

        {/* Search Box */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="flex-1">
            <Label htmlFor="student-search" className="text-sm">
              Search Student
            </Label>
            <div className="relative">
              <Input
                id="student-search"
                type="text"
                placeholder="Search by name or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                  {searchResults.map((student) => (
                    <button
                      key={student.studentId}
                      type="button"
                      onClick={() => handleSelectStudent(student.studentId)}
                      className="w-full px-4 py-2 text-left hover:bg-muted flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{student.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.studentNumber} • {student.className}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            type="submit"
            className="sm:mt-auto bg-emerald-600 hover:bg-emerald-700"
            disabled={isSearching}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      {/* Student Not Selected State */}
      {!selectedStudent && !isLoadingStudent && (
        <div className="flex items-center justify-center h-64 border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">
              Search for a student to view their attendance
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingStudent && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading student data...</div>
        </div>
      )}

      {/* Student Data */}
      {selectedStudent && !isLoadingStudent && (
        <>
          {/* Student Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-lg mb-3">
                    Student Information
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.fullName}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Student Number:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.studentNumber}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Class:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.className}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.email}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-3">
                    Assigned Sessions
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground mb-1">Saturday:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.saturdaySession.time}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">Sunday:</dt>
                      <dd className="font-medium">
                        {selectedStudent.student.sundaySession.time}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats - 2 cols mobile, 4 desktop */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {getAttendanceRateBadge(
                      selectedStudent.stats.attendanceRate,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Overall Attendance
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent.stats.presentDays} /{" "}
                    {selectedStudent.stats.totalClassDays} days
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {getAttendanceRateBadge(
                      selectedStudent.stats.saturdayAttendanceRate,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Saturday Attendance
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {getAttendanceRateBadge(
                      selectedStudent.stats.sundayAttendanceRate,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sunday Attendance
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedStudent.stats.absentDays}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Absent Days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance History Table */}
          <div>
            <h4 className="font-semibold mb-4">Attendance History</h4>
            {selectedStudent.attendanceRecords.length === 0 ? (
              <div className="flex items-center justify-center h-32 border rounded-lg">
                <p className="text-muted-foreground">
                  No attendance records found
                </p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-[700px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Session Time</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">
                          Correct Session
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudent.attendanceRecords.map(
                        (record, index) => (
                          <TableRow key={`${record.date}-${index}`}>
                            <TableCell className="font-medium">
                              {new Date(record.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.day}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.sessionTime}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(record.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.isCorrectSession ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-orange-600">✗</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      )}
    </div>
  );
}
