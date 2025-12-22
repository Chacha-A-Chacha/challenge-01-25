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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Info } from "lucide-react"
import type { CourseWithDetails } from "@/types"

interface ReplaceHeadTeacherModalProps {
  course: CourseWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newHeadTeacherId: string, removeOldTeacher: boolean) => Promise<void>
  isReplacing: boolean
}

export function ReplaceHeadTeacherModal({
  course,
  open,
  onOpenChange,
  onConfirm,
  isReplacing
}: ReplaceHeadTeacherModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [removeOldTeacher, setRemoveOldTeacher] = useState(false)

  if (!course) return null

  // Get additional teachers (not the current head)
  const additionalTeachers = course.teachers?.filter(
    (teacher) => teacher.id !== course.headTeacherId
  ) || []

  const hasAdditionalTeachers = additionalTeachers.length > 0

  const handleConfirm = async () => {
    if (selectedTeacherId) {
      await onConfirm(selectedTeacherId, removeOldTeacher)
      setSelectedTeacherId("")
      setRemoveOldTeacher(false)
    }
  }

  const handleClose = () => {
    if (!isReplacing) {
      onOpenChange(false)
      setSelectedTeacherId("")
      setRemoveOldTeacher(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Replace Head Teacher</DialogTitle>
          <DialogDescription>
            Select a new head teacher for this course. The current head teacher will be demoted or removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasAdditionalTeachers && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No additional teachers available in this course. You need to add additional teachers first before replacing the head teacher.
              </AlertDescription>
            </Alert>
          )}

          {hasAdditionalTeachers && (
            <>
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p className="font-medium">Current Head Teacher:</p>
                <p>{course.headTeacher.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newHeadTeacher">New Head Teacher</Label>
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                  disabled={isReplacing}
                >
                  <SelectTrigger id="newHeadTeacher">
                    <SelectValue placeholder="Select a teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {additionalTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>What should happen to the current head teacher?</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant={!removeOldTeacher ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setRemoveOldTeacher(false)}
                    disabled={isReplacing}
                  >
                    <div className="text-left">
                      <div className="font-medium">Demote to Additional Teacher</div>
                      <div className="text-xs text-muted-foreground">
                        Keep them in the course as an additional teacher
                      </div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={removeOldTeacher ? "destructive" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setRemoveOldTeacher(true)}
                    disabled={isReplacing}
                  >
                    <div className="text-left">
                      <div className="font-medium">Remove from Course</div>
                      <div className="text-xs opacity-70">
                        Remove them completely from this course
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isReplacing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTeacherId || isReplacing || !hasAdditionalTeachers}
          >
            {isReplacing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Replace Head Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
