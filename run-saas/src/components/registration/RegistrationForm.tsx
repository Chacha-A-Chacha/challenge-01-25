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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VALIDATION_RULES } from "@/lib/constants";

export function RegistrationForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );

  const {
    formData,
    courses,
    classes,
    sessions,
    isLoadingCourses,
    isLoadingClasses,
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
  }, [loadCourses]);

  // Auto-select first available class when classes load
  useEffect(() => {
    if (classes.length === 1 && !formData.classId) {
      const firstClass = classes[0];
      if (
        firstClass.hasSaturdayAvailability &&
        firstClass.hasSundayAvailability
      ) {
        setField("classId", firstClass.id);
      }
    }
  }, [classes, formData.classId, setField]);

  // Field validation functions
  const validateEmail = (email: string): string | null => {
    if (!email) return null;
    if (!VALIDATION_RULES.EMAIL.REGEX.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    if (!VALIDATION_RULES.PHONE.LOCAL_REGEX.test(phone)) {
      return "Please enter a valid phone number (e.g., 0712345678)";
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return null;
    if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
      return `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`;
    }
    return null;
  };

  const validateConfirmPassword = (confirmPwd: string): string | null => {
    if (!confirmPwd) return null;
    if (confirmPwd !== formData.password) {
      return "Passwords do not match";
    }
    return null;
  };

  const validateReceiptNumber = (receiptNo: string): string | null => {
    if (!receiptNo) return null;
    if (!VALIDATION_RULES.RECEIPT_NUMBER.REGEX.test(receiptNo)) {
      return "Receipt number must contain only digits";
    }
    if (receiptNo.length < VALIDATION_RULES.RECEIPT_NUMBER.MIN_LENGTH) {
      return `Receipt number must be at least ${VALIDATION_RULES.RECEIPT_NUMBER.MIN_LENGTH} digits`;
    }
    return null;
  };

  const handleFieldBlur = (field: string, value: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    let error: string | null = null;
    switch (field) {
      case "email":
        error = validateEmail(value);
        break;
      case "phoneNumber":
        error = validatePhone(value);
        break;
      case "password":
        error = validatePassword(value);
        break;
      case "confirmPassword":
        error = validateConfirmPassword(value);
        break;
      case "paymentReceiptNo":
        error = validateReceiptNumber(value);
        break;
    }

    setFieldErrors((prev) => ({
      ...prev,
      [field]: error || "",
    }));
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setField(field, value);

    // Clear error when user starts typing
    if (touchedFields[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submission
    const errors: Record<string, string> = {};

    if (validateEmail(formData.email))
      errors.email = validateEmail(formData.email)!;
    if (formData.phoneNumber && validatePhone(formData.phoneNumber)) {
      errors.phoneNumber = validatePhone(formData.phoneNumber)!;
    }
    if (validatePassword(formData.password))
      errors.password = validatePassword(formData.password)!;
    if (validateConfirmPassword(formData.confirmPassword)) {
      errors.confirmPassword = validateConfirmPassword(
        formData.confirmPassword,
      )!;
    }
    if (validateReceiptNumber(formData.paymentReceiptNo)) {
      errors.paymentReceiptNo = validateReceiptNumber(
        formData.paymentReceiptNo,
      )!;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouchedFields({
        email: true,
        phoneNumber: true,
        password: true,
        confirmPassword: true,
        paymentReceiptNo: true,
      });
      return;
    }

    const success = await submit();
    if (success) {
      router.push("/register/success");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFieldErrors((prev) => ({
          ...prev,
          paymentReceiptUrl: "Please upload an image file",
        }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors((prev) => ({
          ...prev,
          paymentReceiptUrl: "File size must be less than 5MB",
        }));
        return;
      }

      const url = URL.createObjectURL(file);
      setField("paymentReceiptUrl", url);
      setImagePreview(url);
      setFieldErrors((prev) => ({ ...prev, paymentReceiptUrl: "" }));
    }
  };

  const clearUploadedFile = () => {
    setField("paymentReceiptUrl", "");
    setImagePreview(null);
  };

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFieldErrors((prev) => ({
          ...prev,
          portraitPhotoUrl: "Please upload an image file",
        }));
        return;
      }

      // Validate file size (2MB for portrait)
      if (file.size > 2 * 1024 * 1024) {
        setFieldErrors((prev) => ({
          ...prev,
          portraitPhotoUrl: "File size must be less than 2MB",
        }));
        return;
      }

      const url = URL.createObjectURL(file);
      setField("portraitPhotoUrl", url);
      setPortraitPreview(url);
      setFieldErrors((prev) => ({ ...prev, portraitPhotoUrl: "" }));
    }
  };

  const clearPortraitPhoto = () => {
    setField("portraitPhotoUrl", "");
    setPortraitPreview(null);
  };

  if (!ready || isLoadingCourses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-600 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Student Registration
          </h1>
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
          <Card className="border-blue-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-sm">1</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Select Course</CardTitle>
                  <CardDescription>
                    Choose your program of study
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.courseId}
                onValueChange={(value) => setField("courseId", value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{course.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Class Selection */}
          {formData.courseId && (
            <Card className="border-purple-100">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-700 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Select Class</CardTitle>
                    <CardDescription>
                      {classes.length === 1 &&
                      classes[0].hasSaturdayAvailability &&
                      classes[0].hasSundayAvailability
                        ? "Class automatically selected"
                        : "Choose your class - you'll attend both sessions here"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingClasses ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    <p className="text-sm text-gray-600 mt-2">
                      Loading classes...
                    </p>
                  </div>
                ) : classes.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No classes available for this course. Please select a
                      different course.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {classes.map((cls) => {
                      const isDisabled =
                        !cls.hasSaturdayAvailability ||
                        !cls.hasSundayAvailability;
                      const isSelected = formData.classId === cls.id;

                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() =>
                            !isDisabled && setField("classId", cls.id)
                          }
                          disabled={isDisabled}
                          className={cn(
                            "w-full p-4 rounded-lg border-2 text-left transition-all",
                            isSelected
                              ? "border-purple-500 bg-purple-50 shadow-sm"
                              : "border-gray-200 hover:border-purple-200 hover:bg-gray-50",
                            isDisabled &&
                              "opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white",
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {cls.name}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {cls.saturdaySessions} Saturday session
                                {cls.saturdaySessions !== 1 ? "s" : ""} •{" "}
                                {cls.sundaySessions} Sunday session
                                {cls.sundaySessions !== 1 ? "s" : ""}
                              </p>
                              {isDisabled && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                  No availability
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div
                                className={cn(
                                  "text-sm font-semibold",
                                  isDisabled
                                    ? "text-gray-400"
                                    : "text-purple-700",
                                )}
                              >
                                {cls.availableSpots}{" "}
                                {cls.availableSpots === 1 ? "spot" : "spots"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                of {cls.capacity}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sessions */}
          {formData.classId && (
            <Card className="border-emerald-100">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold text-sm">
                      3
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Select Sessions</CardTitle>
                    <CardDescription>
                      Choose one time slot for each day
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    <p className="text-sm text-gray-600 mt-2">
                      Loading sessions...
                    </p>
                  </div>
                ) : sessions ? (
                  <div className="space-y-6">
                    {/* Saturday */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                        Saturday Sessions
                      </h4>
                      {sessions.saturday.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No Saturday sessions available
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {sessions.saturday.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={s.isFull}
                              onClick={() =>
                                setField("saturdaySessionId", s.id)
                              }
                              className={cn(
                                "w-full p-3 rounded-lg border-2 text-left transition-all",
                                formData.saturdaySessionId === s.id
                                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                  : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50",
                                s.isFull &&
                                  "opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white",
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  {formData.saturdaySessionId === s.id && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  )}
                                  <span className="font-medium text-gray-900">
                                    {s.startTime} - {s.endTime}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    s.isFull ? "text-red-600" : "text-gray-600",
                                  )}
                                >
                                  {s.isFull
                                    ? "FULL"
                                    : `${s.available} spots left`}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sunday */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                        Sunday Sessions
                      </h4>
                      {sessions.sunday.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No Sunday sessions available
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {sessions.sunday.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={s.isFull}
                              onClick={() => setField("sundaySessionId", s.id)}
                              className={cn(
                                "w-full p-3 rounded-lg border-2 text-left transition-all",
                                formData.sundaySessionId === s.id
                                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                  : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50",
                                s.isFull &&
                                  "opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white",
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  {formData.sundaySessionId === s.id && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  )}
                                  <span className="font-medium text-gray-900">
                                    {s.startTime} - {s.endTime}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    s.isFull ? "text-red-600" : "text-gray-600",
                                  )}
                                >
                                  {s.isFull
                                    ? "FULL"
                                    : `${s.available} spots left`}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Personal Info */}
          <Card className="border-orange-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-sm">4</span>
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Personal Information
                  </CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="surname">
                    Surname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) =>
                      handleFieldChange("surname", e.target.value)
                    }
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleFieldChange("firstName", e.target.value)
                    }
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Other Names</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleFieldChange("lastName", e.target.value)
                  }
                  className="h-11"
                />
              </div>

              {/* Portrait Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="portraitPhoto">Portrait Photo (Optional)</Label>

                {!portraitPreview ? (
                  <div className="relative">
                    <input
                      id="portraitPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePortraitUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="portraitPhoto"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-orange-400 mb-2" />
                      <span className="text-sm text-gray-600 font-medium">
                        Click to upload portrait
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Passport-size photo (PNG, JPG max 2MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative border-2 border-orange-200 rounded-lg p-3 bg-orange-50">
                    <div className="flex items-start gap-3">
                      <img
                        src={portraitPreview}
                        alt="Portrait preview"
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          Portrait uploaded successfully
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          Click the × button to change
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearPortraitPhoto}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {fieldErrors.portraitPhotoUrl && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.portraitPhotoUrl}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  onBlur={(e) => handleFieldBlur("email", e.target.value)}
                  required
                  className={cn(
                    "h-11",
                    touchedFields.email &&
                      fieldErrors.email &&
                      "border-red-500",
                  )}
                />
                {touchedFields.email && fieldErrors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleFieldChange("phoneNumber", e.target.value)
                  }
                  onBlur={(e) => handleFieldBlur("phoneNumber", e.target.value)}
                  className={cn(
                    "h-11",
                    touchedFields.phoneNumber &&
                      fieldErrors.phoneNumber &&
                      "border-red-500",
                  )}
                />
                {touchedFields.phoneNumber && fieldErrors.phoneNumber && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.phoneNumber}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border-indigo-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">5</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Create Password</CardTitle>
                  <CardDescription>Secure your account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleFieldChange("password", e.target.value)
                    }
                    onBlur={(e) => handleFieldBlur("password", e.target.value)}
                    required
                    minLength={8}
                    className={cn(
                      "h-11 pr-10",
                      touchedFields.password &&
                        fieldErrors.password &&
                        "border-red-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touchedFields.password && fieldErrors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleFieldChange("confirmPassword", e.target.value)
                    }
                    onBlur={(e) =>
                      handleFieldBlur("confirmPassword", e.target.value)
                    }
                    required
                    className={cn(
                      "h-11 pr-10",
                      touchedFields.confirmPassword &&
                        fieldErrors.confirmPassword &&
                        "border-red-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touchedFields.confirmPassword &&
                  fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="border-pink-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                  <span className="text-pink-700 font-bold text-sm">6</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Payment Proof</CardTitle>
                  <CardDescription>Upload your payment receipt</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptNo">
                  Receipt Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="receiptNo"
                  placeholder="Enter receipt number (digits only)"
                  value={formData.paymentReceiptNo}
                  onChange={(e) =>
                    handleFieldChange("paymentReceiptNo", e.target.value)
                  }
                  onBlur={(e) =>
                    handleFieldBlur("paymentReceiptNo", e.target.value)
                  }
                  required
                  className={cn(
                    "h-11",
                    touchedFields.paymentReceiptNo &&
                      fieldErrors.paymentReceiptNo &&
                      "border-red-500",
                  )}
                />
                {touchedFields.paymentReceiptNo &&
                  fieldErrors.paymentReceiptNo && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.paymentReceiptNo}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptImage">
                  Receipt Image <span className="text-red-500">*</span>
                </Label>

                {!imagePreview ? (
                  <div className="relative">
                    <input
                      id="receiptImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      required={!formData.paymentReceiptUrl}
                      className="hidden"
                    />
                    <label
                      htmlFor="receiptImage"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 font-medium">
                        Click to upload receipt
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PNG, JPG, WEBP (max 5MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative border-2 border-pink-200 rounded-lg p-3 bg-pink-50">
                    <div className="flex items-start gap-3">
                      <img
                        src={imagePreview}
                        alt="Receipt preview"
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-pink-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-pink-600" />
                          Receipt uploaded successfully
                        </p>
                        <p className="text-xs text-pink-700 mt-1">
                          Click the × button to change
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearUploadedFile}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {fieldErrors.paymentReceiptUrl && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.paymentReceiptUrl}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting Registration...
              </>
            ) : (
              "Submit Registration"
            )}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
