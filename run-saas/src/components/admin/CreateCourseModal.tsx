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
import { Loader2, AlertCircle } from "lucide-react"
import { useCourseStore } from "@/store"
import { toast } from "sonner"

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseModal({ open, onOpenChange }: CreateCourseModalProps) {
  const { createCourse, isCreating, error } = useCourseStore()

  const [courseName, setCourseName] = useState("")
  const [headTeacherEmail, setHeadTeacherEmail] = useState("")
  const [headTeacherPassword, setHeadTeacherPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await createCourse({
      courseName,
      headTeacherEmail,
      headTeacherPassword
    })

    if (result) {
      toast.success("Course created successfully!")
      onOpenChange(false)
      // Reset form
      setCourseName("")
      setHeadTeacherEmail("")
      setHeadTeacherPassword("")
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false)
      setCourseName("")
      setHeadTeacherEmail("")
      setHeadTeacherPassword("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Create a new course and assign a head teacher. The head teacher will manage the course.
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
                placeholder="e.g. Programming 101"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="headTeacherEmail">Head Teacher Email</Label>
              <Input
                id="headTeacherEmail"
                type="email"
                placeholder="teacher@example.com"
                value={headTeacherEmail}
                onChange={(e) => setHeadTeacherEmail(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="headTeacherPassword">Head Teacher Password</Label>
              <Input
                id="headTeacherPassword"
                type="password"
                placeholder="Minimum 8 characters"
                value={headTeacherPassword}
                onChange={(e) => setHeadTeacherPassword(e.target.value)}
                disabled={isCreating}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                The head teacher will use this password to log in.
              </p>
            </div>
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
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
