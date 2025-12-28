"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { AlertCircle, Loader2 } from "lucide-react";
import { useClassSessions } from "@/store/teacher/class-store";
import { SESSION_RULES, CLASS_RULES } from "@/lib/constants";
import type { Session, WeekDay } from "@/types";

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  existingSessions: Session[];
}

export function CreateSessionModal({
  open,
  onClose,
  classId,
  existingSessions,
}: CreateSessionModalProps) {
  const { createSession, isCreating } = useClassSessions();
  const [day, setDay] = useState<WeekDay>("SATURDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [capacity, setCapacity] = useState(CLASS_RULES.DEFAULT_CAPACITY.toString());
  const [error, setError] = useState<string | null>(null);

  const validateTimeFormat = (time: string): boolean => {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  };

  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const hasTimeConflict = (): boolean => {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    return existingSessions.some((session) => {
      if (session.day !== day) return false;

      const sessionStart = parseTimeToMinutes(
        new Date(session.startTime).toTimeString().slice(0, 5)
      );
      const sessionEnd = parseTimeToMinutes(
        new Date(session.endTime).toTimeString().slice(0, 5)
      );

      return (
        (startMinutes >= sessionStart && startMinutes < sessionEnd) ||
        (endMinutes > sessionStart && endMinutes <= sessionEnd) ||
        (startMinutes <= sessionStart && endMinutes >= sessionEnd)
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate time format
    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      setError("Please enter valid times in HH:MM format");
      return;
    }

    // Validate time range
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    const minStartMinutes = parseTimeToMinutes(SESSION_RULES.MIN_START_TIME);
    const maxEndMinutes = parseTimeToMinutes(SESSION_RULES.MAX_END_TIME);

    if (startMinutes < minStartMinutes) {
      setError(`Start time cannot be before ${SESSION_RULES.MIN_START_TIME}`);
      return;
    }

    if (endMinutes > maxEndMinutes) {
      setError(`End time cannot be after ${SESSION_RULES.MAX_END_TIME}`);
      return;
    }

    if (endMinutes <= startMinutes) {
      setError("End time must be after start time");
      return;
    }

    // Validate duration
    const duration = endMinutes - startMinutes;
    if (duration < SESSION_RULES.MIN_DURATION_MINUTES) {
      setError(
        `Session must be at least ${SESSION_RULES.MIN_DURATION_MINUTES} minutes`
      );
      return;
    }
    if (duration > SESSION_RULES.MAX_DURATION_MINUTES) {
      setError(
        `Session cannot exceed ${SESSION_RULES.MAX_DURATION_MINUTES} minutes`
      );
      return;
    }

    // Validate capacity
    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      setError("Capacity must be at least 1");
      return;
    }
    if (capacityNum > CLASS_RULES.MAX_CAPACITY) {
      setError(`Capacity cannot exceed ${CLASS_RULES.MAX_CAPACITY}`);
      return;
    }

    // Check for time conflicts
    if (hasTimeConflict()) {
      setError("This time slot conflicts with an existing session");
      return;
    }

    const result = await createSession(classId, {
      day,
      startTime,
      endTime,
      capacity: capacityNum,
    });

    if (result) {
      handleClose();
    } else {
      setError("Failed to create session. Please try again.");
    }
  };

  const handleClose = () => {
    setDay("SATURDAY");
    setStartTime("09:00");
    setEndTime("11:00");
    setCapacity(CLASS_RULES.DEFAULT_CAPACITY.toString());
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Add a new session to this class. Sessions are scheduled on Saturday
            or Sunday.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="day">Day</Label>
            <Select
              value={day}
              onValueChange={(value) => setDay(value as WeekDay)}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min={SESSION_RULES.MIN_START_TIME}
                max={SESSION_RULES.MAX_END_TIME}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={SESSION_RULES.MIN_START_TIME}
                max={SESSION_RULES.MAX_END_TIME}
                disabled={isCreating}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Sessions must be between {SESSION_RULES.MIN_START_TIME} and{" "}
            {SESSION_RULES.MAX_END_TIME}, duration{" "}
            {SESSION_RULES.MIN_DURATION_MINUTES}-
            {SESSION_RULES.MAX_DURATION_MINUTES} minutes.
          </p>

          <div className="space-y-2">
            <Label htmlFor="session-capacity">Capacity</Label>
            <Input
              id="session-capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
              max={CLASS_RULES.MAX_CAPACITY}
              disabled={isCreating}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
