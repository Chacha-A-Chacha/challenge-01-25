// components/auth/AdminTeacherLoginForm.tsx
"use client"

import { useRouter } from 'next/navigation'
import { useLogin, useAuth } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, User } from 'lucide-react'

export function AdminTeacherLoginForm() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    loginData,
    loginError,
    isLoggingIn,
    signIn,
    updateLoginData,
    clearLoginError
  } = useLogin()

  // Redirect if already authenticated
  if (user) {
    if (user.role === 'admin') {
      router.push('/admin')
    } else if (user.role === 'teacher') {
      router.push('/teacher')
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearLoginError()

    // Basic validation
    if (!loginData.email?.trim() || !loginData.password?.trim()) {
      return
    }

    const success = await signIn(loginData, 'admin-teacher')

    if (success) {
      // Redirect will be handled by auth state change
      // useAuth hook will trigger navigation based on role
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLoginData({ email: e.target.value.toLowerCase().trim() })
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLoginData({ password: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Staff Login</CardTitle>
          <CardDescription>
            Access for administrators and teachers
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@school.com"
                value={loginData.email || ''}
                onChange={handleEmailChange}
                disabled={isLoggingIn}
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password || ''}
                onChange={handlePasswordChange}
                disabled={isLoggingIn}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn || !loginData.email?.trim() || !loginData.password?.trim()}
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Error Display */}
            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {loginError}
                </AlertDescription>
              </Alert>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">
                    Staff Access Only
                  </p>
                  <p className="text-blue-700">
                    This login is for administrators and teachers.
                    Students should use the regular login page.
                  </p>
                </div>
              </div>
            </div>

            {/* Student Login Link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Student?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push('/login')}
                >
                  Login here
                </Button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
