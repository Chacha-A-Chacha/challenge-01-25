"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface TeacherExportButtonProps {
  startDate: string;
  endDate: string;
  classId?: string;
  sessionId?: string;
}

export function TeacherExportButton({
  startDate,
  endDate,
  classId,
  sessionId,
}: TeacherExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: "csv",
      });

      if (classId) params.append("classId", classId);
      if (sessionId) params.append("sessionId", sessionId);

      const response = await fetch(
        `/api/teacher/attendance/export?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-export-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
      className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50"
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export to CSV"}
    </Button>
  );
}
