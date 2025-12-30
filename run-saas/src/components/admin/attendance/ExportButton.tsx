"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  startDate: string;
  endDate: string;
  courseId?: string;
  classId?: string;
  sessionId?: string;
  status?: string;
}

export function ExportButton({
  startDate,
  endDate,
  courseId,
  classId,
  sessionId,
  status,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const buildExportUrl = (format: "csv" | "json") => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format,
    });

    if (courseId) params.append("courseId", courseId);
    if (classId) params.append("classId", classId);
    if (sessionId) params.append("sessionId", sessionId);
    if (status) params.append("status", status);

    return `/api/admin/attendance/export?${params.toString()}`;
  };

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);

    try {
      const url = buildExportUrl(format);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename =
        filenameMatch?.[1] ||
        `attendance-export-${startDate}-to-${endDate}.${format}`;

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Show success message
      alert(`Attendance data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Failed to export data"}`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
