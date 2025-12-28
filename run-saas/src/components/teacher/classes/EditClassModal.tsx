"use client";

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useClassActions } from "@/store/teacher/class-store";
import { CLASS_RULES } from "@/lib/constants";

interface ClassItem {
  id: string;
  name: string;
  capacity: number;
  students?: { id: string }[];
  _count?: {
    students: number;
  };
}

interface EditClassModalProps {
  open: boolean;
  onClose: () => void;
  classItem: ClassItem;
}

export function EditClassModal({
  open,
  onClose,
  classItem,
}: EditClassModalProps) {
  const { updateClass, isUpdating, error, clearErrors } = useClassActions();
  const [name, setName] = useState(classItem.name);
  const [capacity, setCapacity] = useState(classItem.capacity.toString());
  const [validationError, setValidationError] = useState<string | null>(null);

  const studentCount =
    classItem._count?.students || classItem.students?.length || 0;

  // Reset form when classItem changes
  useEffect(() => {
    setName(classItem.name);
    setCapacity(classItem.capacity.toString());
    setValidationError(null);
  }, [classItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearErrors();

    // Validate name
    if (!name.trim()) {
      setValidationError("Class name is required");
      return;
    }
    if (name.trim().length < 2) {
      setValidationError("Class name must be at least 2 characters");
      return;
    }
    if (name.trim().length > 50) {
      setValidationError("Class name must be at most 50 characters");
      return;
    }

    // Validate capacity
    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      setValidationError("Capacity must be at least 1");
      return;
    }
    if (capacityNum > CLASS_RULES.MAX_CAPACITY) {
      setValidationError(`Capacity cannot exceed ${CLASS_RULES.MAX_CAPACITY}`);
      return;
    }
    if (capacityNum < studentCount) {
      setValidationError(
        `Capacity cannot be less than current student count (${studentCount})`
      );
      return;
    }

    const result = await updateClass(classItem.id, {
      name: name.trim(),
      capacity: capacityNum,
    });
    if (result) {
      handleClose();
    }
  };

  const handleClose = () => {
    setName(classItem.name);
    setCapacity(classItem.capacity.toString());
    setValidationError(null);
    clearErrors();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update the class name and capacity. Capacity cannot be reduced below
            the current student count ({studentCount}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(validationError || error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError || error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Class Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Class A, Morning Group"
              disabled={isUpdating}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-capacity">Capacity</Label>
            <Input
              id="edit-capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={studentCount || 1}
              max={CLASS_RULES.MAX_CAPACITY}
              disabled={isUpdating}
            />
            <p className="text-xs text-muted-foreground">
              Current students: {studentCount} | Maximum: {CLASS_RULES.MAX_CAPACITY}
            </p>
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
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
