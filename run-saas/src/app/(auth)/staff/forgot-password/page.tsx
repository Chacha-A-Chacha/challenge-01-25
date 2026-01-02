"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function StaffForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"admin" | "teacher">("teacher");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          userType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to send reset link");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="border-emerald-100 shadow-xl">
          <CardHeader className="space-y-4 pb-6">
            {/* Logo and Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-600">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Weekend Academy
                </h1>
                <div className="inline-flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="text-sm font-medium text-emerald-700">
                    Staff Portal
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <CardTitle className="text-xl font-semibold">
                Forgot Password?
              </CardTitle>
              <CardDescription className="mt-1.5">
                {success
                  ? "Check your email for reset instructions"
                  : "Enter your details to receive a password reset link"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    If an account exists with this email, you will receive
                    password reset instructions shortly.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Please check your email and:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Look for an email from Weekend Academy</li>
                    <li>Click the reset link within 60 minutes</li>
                    <li>Check your spam folder if you don't see it</li>
                  </ul>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/staff-login")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Account Type</Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value) =>
                      setUserType(value as "admin" | "teacher")
                    }
                    disabled={isLoading}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teacher" id="teacher" />
                      <Label
                        htmlFor="teacher"
                        className="font-normal cursor-pointer"
                      >
                        Teacher
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label
                        htmlFor="admin"
                        className="font-normal cursor-pointer"
                      >
                        Administrator
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email address associated with your staff account
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/staff-login")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} Weekend Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
}
