import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users, CheckCircle } from "lucide-react";

interface AttendanceStatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AttendanceStatsCard({
  title,
  value,
  subtitle,
  trend,
  variant = "default",
  icon,
  onClick,
  className,
}: AttendanceStatsCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-green-200 bg-green-50 dark:bg-green-900/10",
    warning: "border-orange-200 bg-orange-50 dark:bg-orange-900/10",
    danger: "border-red-200 bg-red-50 dark:bg-red-900/10",
  };

  const valueColors = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-orange-600 dark:text-orange-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <Card
      className={cn(
        "transition-all",
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColors[variant])}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CourseStatsCardProps {
  courseName: string;
  totalStudents: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  lastRecordedDate: string | null;
  onClick?: () => void;
}

export function CourseStatsCard({
  courseName,
  totalStudents,
  attendanceRate,
  presentCount,
  absentCount,
  wrongSessionCount,
  lastRecordedDate,
  onClick,
}: CourseStatsCardProps) {
  const getStatusVariant = (rate: number) => {
    if (rate >= 80) return "success";
    if (rate >= 60) return "warning";
    return "danger";
  };

  const variant = getStatusVariant(attendanceRate);

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{courseName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalStudents} students enrolled
            </p>
          </div>
          <Badge
            variant={
              variant === "success"
                ? "default"
                : variant === "warning"
                  ? "secondary"
                  : "destructive"
            }
          >
            {attendanceRate}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Present</span>
            <span className="font-medium text-green-600">{presentCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Absent</span>
            <span className="font-medium text-red-600">{absentCount}</span>
          </div>
          {wrongSessionCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wrong Session</span>
              <span className="font-medium text-orange-600">
                {wrongSessionCount}
              </span>
            </div>
          )}
          {lastRecordedDate && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Last recorded</span>
              <span>
                {new Date(lastRecordedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
