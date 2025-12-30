"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StudentSearchResult } from "@/types";
import { cn } from "@/lib/utils";

interface StudentSearchBoxProps {
  onSearch: (query: string) => void;
  onSelectStudent: (studentId: string) => void;
  searchResults: StudentSearchResult[];
  isSearching: boolean;
  selectedStudentId: string | null;
  className?: string;
}

export function StudentSearchBox({
  onSearch,
  onSelectStudent,
  searchResults,
  isSearching,
  selectedStudentId,
  className,
}: StudentSearchBoxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) return;

    const timer = setTimeout(() => {
      onSearch(searchQuery);
      setOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleSelectStudent = (studentId: string) => {
    onSelectStudent(studentId);
    setOpen(false);
  };

  const handleClear = () => {
    setSearchQuery("");
    setOpen(false);
  };

  const selectedStudent = searchResults.find((s) => s.id === selectedStudentId);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-[400px]" align="start">
          <div className="space-y-1">
            {isSearching && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isSearching && searchResults.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No students found
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Students
                </p>
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {student.surname}, {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {student.studentNumber} • {student.className}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedStudent && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="font-medium">
              {selectedStudent.surname}, {selectedStudent.firstName}{" "}
              {selectedStudent.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedStudent.studentNumber} • {selectedStudent.className} •{" "}
              {selectedStudent.email}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
