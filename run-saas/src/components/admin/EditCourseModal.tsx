"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useCourseStore } from "@/store";
import type { CourseWithDetails, CourseStatus } from "@/types";
import { COURSE_STATUS } from "@/types";
import { toast } from "sonner";

interface EditCourseModalProps {
  course: CourseWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { label: "Active", value: COURSE_STATUS.ACTIVE },
  { label: "Inactive", value: COURSE_STATUS.INACTIVE },
  { label: "Completed", value: COURSE_STATUS.COMPLETED },
];

export function EditCourseModal({
  course,
  open,
  onOpenChange,
}: EditCourseModalProps) {
  const { updateCourse, isUpdating, error } = useCourseStore();

  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState<CourseStatus>(COURSE_STATUS.ACTIVE);
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (course) {
      setCourseName(course.name);
      setStatus(course.status);
      setEndDate(
        course.endDate
          ? new Date(course.endDate).toISOString().split("T")[0]
          : "",
      );
    }
  }, [course]);

  if (!course) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Record<string, unknown> = {};

    // Only include changed fields
    if (courseName !== course.name) {
      updates.name = courseName;
    }

    if (status !== course.status) {
      updates.status = status;
    }

    // Handle end date
    const currentEndDate = course.endDate
      ? new Date(course.endDate).toISOString().split("T")[0]
      : "";
    if (endDate !== currentEndDate) {
      updates.endDate = endDate ? new Date(endDate) : null;
    }

    // Check if there are any changes
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    const success = await updateCourse(course.id, updates);

    if (success) {
      toast.success("Course updated successfully!");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onOpenChange(false);
      // Reset to original values
      setCourseName(course.name);
      setStatus(course.status);
      setEndDate(
        course.endDate
          ? new Date(course.endDate).toISOString().split("T")[0]
          : "",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course name, status, or end date. Head teacher management has
            its own section.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                disabled={isUpdating}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CourseStatus)}
                disabled={isUpdating}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set to Completed when the course has finished
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if the course has no specific end date
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
