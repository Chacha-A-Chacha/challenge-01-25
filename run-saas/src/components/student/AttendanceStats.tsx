"use client";

import { XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceStatsProps {
  absences: number;
  wrongSessions: number;
}

export function AttendanceStats({ absences, wrongSessions }: AttendanceStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Absences Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Absences</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">{absences}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {absences === 0
              ? "Perfect attendance!"
              : absences === 1
                ? "1 session missed"
                : `${absences} sessions missed`}
          </p>
        </CardContent>
      </Card>

      {/* Wrong Sessions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wrong Sessions</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">{wrongSessions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {wrongSessions === 0
              ? "All sessions correct"
              : wrongSessions === 1
                ? "Attended wrong session once"
                : `Attended wrong session ${wrongSessions} times`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
