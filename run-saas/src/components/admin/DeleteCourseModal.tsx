"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react"
import type { CourseWithDetails } from "@/types"

interface DeleteCourseModalProps {
  course: CourseWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function DeleteCourseModal({
  course,
  open,
  onOpenChange,
  onConfirm,
  isDeleting
}: DeleteCourseModalProps) {
  const [confirmText, setConfirmText] = useState("")

  if (!course) return null

  const hasClasses = (course._count?.classes || 0) > 0
  const hasTeachers = (course._count?.teachers || 0) > 0
  const canDelete = !hasClasses && confirmText === course.name

  const handleConfirm = async () => {
    if (canDelete) {
      await onConfirm()
      setConfirmText("")
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false)
      setConfirmText("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Course
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasClasses && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot delete course with existing classes. Please remove all classes first.
              </AlertDescription>
            </Alert>
          )}

          {!hasClasses && hasTeachers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This course has {course._count?.teachers} teacher(s). They will be unassigned.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-bold">{course.name}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={course.name}
              disabled={isDeleting || hasClasses}
            />
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <p className="font-medium">Course to be deleted:</p>
            <p>Name: {course.name}</p>
            <p>Head Teacher: {course.headTeacher.email}</p>
            <p>Classes: {course._count?.classes || 0}</p>
            <p>Teachers: {course._count?.teachers || 0}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
