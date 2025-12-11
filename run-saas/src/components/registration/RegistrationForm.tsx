// components/registration/RegistrationForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegistrationStore } from "@/store/registration/registration-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function RegistrationForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const {
    formData,
    courses,
    sessions,
    isLoadingCourses,
    isLoadingSessions,
    isSubmitting,
    error,
    setField,
    loadCourses,
    submit,
  } = useRegistrationStore();

  // Load courses once
  useEffect(() => {
    loadCourses().then(() => setReady(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submit();
    if (success) {
      router.push("/register/success");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setField("paymentReceiptUrl", url);
    }
  };

  if (!ready || isLoadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Courses Available</CardTitle>
            <CardDescription>
              Registration is not currently open
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <GraduationCap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Student Registration</h1>
          <p className="text-gray-600 mt-2">Join Weekend Academy</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Selection */}
          <Card>
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>Select Course</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer ${
                      formData.courseId === course.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="course"
                      value={course.id}
                      checked={formData.courseId === course.id}
                      onChange={(e) => setField("courseId", e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{course.name}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sessions */}
          {formData.courseId && (
            <Card>
              <CardHeader className="bg-emerald-600 text-white">
                <CardTitle>Select Sessions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingSessions ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  </div>
                ) : sessions ? (
                  <div className="space-y-6">
                    {/* Saturday */}
                    <div>
                      <h4 className="font-semibold mb-3">Saturday</h4>
                      <div className="space-y-2">
                        {sessions.saturday.map((s) => (
                          <label
                            key={s.id}
                            className={`block p-3 border-2 rounded cursor-pointer ${
                              formData.saturdaySessionId === s.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            } ${s.isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="radio"
                              disabled={s.isFull}
                              checked={formData.saturdaySessionId === s.id}
                              onChange={() =>
                                setField("saturdaySessionId", s.id)
                              }
                              className="sr-only"
                            />
                            <div className="flex justify-between">
                              <span>
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className="text-sm text-gray-600">
                                {s.isFull ? "FULL" : `${s.available} spots`}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Sunday */}
                    <div>
                      <h4 className="font-semibold mb-3">Sunday</h4>
                      <div className="space-y-2">
                        {sessions.sunday.map((s) => (
                          <label
                            key={s.id}
                            className={`block p-3 border-2 rounded cursor-pointer ${
                              formData.sundaySessionId === s.id
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-gray-200"
                            } ${s.isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="radio"
                              disabled={s.isFull}
                              checked={formData.sundaySessionId === s.id}
                              onChange={() => setField("sundaySessionId", s.id)}
                              className="sr-only"
                            />
                            <div className="flex justify-between">
                              <span>
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className="text-sm text-gray-600">
                                {s.isFull ? "FULL" : `${s.available} spots`}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Personal Info */}
          <Card>
            <CardHeader className="bg-blue-700 text-white">
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="surname">Surname *</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setField("surname", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lastName">Other Names</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setField("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setField("phoneNumber", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader className="bg-emerald-700 text-white">
              <CardTitle>Create Password</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>Payment Proof</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="receiptNo">Receipt Number *</Label>
                <Input
                  id="receiptNo"
                  value={formData.paymentReceiptNo}
                  onChange={(e) => setField("paymentReceiptNo", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Receipt Image *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  required={!formData.paymentReceiptUrl}
                />
                {formData.paymentReceiptUrl && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Receipt uploaded
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Registration"
            )}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
