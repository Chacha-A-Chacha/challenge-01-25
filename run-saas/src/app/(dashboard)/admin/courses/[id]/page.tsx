"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCourseStore } from "@/store"
import { DeleteCourseModal } from "@/components/admin/DeleteCourseModal"
import { ReplaceHeadTeacherModal } from "@/components/admin/ReplaceHeadTeacherModal"
import { ClassesSection } from "@/components/admin/ClassesSection"
import type { CourseStatus } from "@/types"
import { COURSE_STATUS } from "@/types"
import { toast } from "sonner"

const getStatusBadgeVariant = (status: CourseStatus) => {
  switch (status) {
    case COURSE_STATUS.ACTIVE:
      return "success"
    case COURSE_STATUS.INACTIVE:
      return "warning"
    case COURSE_STATUS.COMPLETED:
      return "secondary"
    default:
      return "default"
  }
}

export default function CourseDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const {
    courses,
    selectedCourse,
    selectCourse,
    loadCourses,
    replaceHeadTeacher,
    isLoading,
    isUpdating
  } = useCourseStore()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isReplaceHeadTeacherModalOpen, setIsReplaceHeadTeacherModalOpen] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    const course = courses.find((c) => c.id === params.id)
    if (course) {
      selectCourse(course)
    }
  }, [courses, params.id, selectCourse])

  const handleDeleteCourse = async () => {
    // TODO: Implement delete course functionality
    // For now, just show a toast
    toast.error("Delete course functionality coming soon")
    setIsDeleteModalOpen(false)
  }

  const handleReplaceHeadTeacher = async (newHeadTeacherId: string, removeOldTeacher: boolean) => {
    if (!selectedCourse) return

    const success = await replaceHeadTeacher(
      selectedCourse.id,
      newHeadTeacherId,
      removeOldTeacher
    )

    if (success) {
      toast.success(
        removeOldTeacher
          ? "Head teacher replaced. Previous head teacher removed from course."
          : "Head teacher replaced successfully."
      )
      setIsReplaceHeadTeacherModalOpen(false)
      await loadCourses()
    } else {
      toast.error("Failed to replace head teacher")
    }
  }

  if (isLoading && !selectedCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!selectedCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => router.push("/admin/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  const additionalTeachers = selectedCourse.teachers?.filter(
    (t) => t.id !== selectedCourse.headTeacherId
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/courses")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedCourse.name}</h1>
            <p className="text-muted-foreground">Course Details & Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Course Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(selectedCourse.status)}>
                  {selectedCourse.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="mt-1">{new Date(selectedCourse.createdAt).toLocaleDateString()}</p>
            </div>
            {selectedCourse.endDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p className="mt-1">{new Date(selectedCourse.endDate).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
              <p className="mt-1 text-2xl font-bold">{selectedCourse._count?.classes || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Head Teacher Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Head Teacher</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReplaceHeadTeacherModalOpen(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Replace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 font-semibold text-lg">
                {selectedCourse.headTeacher.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium">{selectedCourse.headTeacher.email}</p>
              <p className="text-sm text-muted-foreground">Head Teacher</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Teachers Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Additional Teachers</CardTitle>
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {additionalTeachers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No additional teachers assigned to this course.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {additionalTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-semibold">
                      {teacher.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{teacher.email}</p>
                    <p className="text-sm text-muted-foreground">Additional Teacher</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes & Sessions */}
      <ClassesSection course={selectedCourse} />

      {/* Modals */}
      <DeleteCourseModal
        course={selectedCourse}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteCourse}
        isDeleting={false}
      />

      <ReplaceHeadTeacherModal
        course={selectedCourse}
        open={isReplaceHeadTeacherModalOpen}
        onOpenChange={setIsReplaceHeadTeacherModalOpen}
        onConfirm={handleReplaceHeadTeacher}
        isReplacing={isUpdating}
      />
    </div>
  )
}
