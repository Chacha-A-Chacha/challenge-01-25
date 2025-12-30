import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StudentAttendanceRecord } from "@/types";

interface StudentAttendanceTableProps {
  records: StudentAttendanceRecord[];
  isLoading?: boolean;
}

export function StudentAttendanceTable({
  records,
  isLoading,
}: StudentAttendanceTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">
          Loading attendance records...
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground">No attendance records found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This student has no attendance records for the selected date range
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scan Time</TableHead>
            <TableHead>Marked By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">
                {new Date(record.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {record.day === "SATURDAY" ? "Sat" : "Sun"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{record.sessionName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.sessionTime}
              </TableCell>
              <TableCell>{getStatusBadge(record.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.scanTime
                  ? new Date(record.scanTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "N/A"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.markedByName || "System"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
