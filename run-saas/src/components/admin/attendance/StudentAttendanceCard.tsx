import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentAttendanceRecord } from "@/types";

interface StudentAttendanceCardProps {
  record: StudentAttendanceRecord;
  onClick?: () => void;
}

export function StudentAttendanceCard({
  record,
  onClick,
}: StudentAttendanceCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="default" className="bg-green-600">
            Present
          </Badge>
        );
      case "ABSENT":
        return <Badge variant="destructive">Absent</Badge>;
      case "WRONG_SESSION":
        return <Badge variant="secondary">Wrong Session</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "border-l-green-500";
      case "ABSENT":
        return "border-l-red-500";
      case "WRONG_SESSION":
        return "border-l-orange-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md border-l-4",
        getStatusColor(record.status),
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Date and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <h3 className="font-semibold text-base">
                  {new Date(record.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {record.day === "SATURDAY" ? "Saturday" : "Sunday"}
              </Badge>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(record.status)}
            </div>
          </div>

          {/* Session Info */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Session</span>
              <span className="font-medium text-right truncate max-w-[60%]">
                {record.sessionName}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{record.sessionTime}</span>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-2 pt-2 border-t">
            {record.scanTime && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Scan Time</span>
                </div>
                <span className="font-medium">
                  {new Date(record.scanTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Marked By</span>
              </div>
              <span className="font-medium truncate max-w-[60%]">
                {record.markedByName || "System"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
