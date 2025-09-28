// components/auth/StudentLoginForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLogin } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'

type AuthMethod = 'phone' | 'email' | 'name'

export function StudentLoginForm() {
  const router = useRouter()
  const {
    loginData,
    loginError,
    isLoggingIn,
    signIn,
    updateLoginData,
    clearLoginError
  } = useLogin()

  const [currentMethod, setCurrentMethod] = useState<AuthMethod>('phone')
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [attemptedMethods, setAttemptedMethods] = useState<Set<AuthMethod>>(new Set())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearLoginError()

    // Validate required fields based on method
    if (!loginData.studentNumber?.trim()) {
      return
    }

    let hasRequiredFields = false
    switch (currentMethod) {
      case 'phone':
        hasRequiredFields = !!loginData.phoneNumber?.trim()
        break
      case 'email':
        hasRequiredFields = !!loginData.email?.trim()
        break
      case 'name':
        hasRequiredFields = !!(loginData.firstName?.trim() && loginData.lastName?.trim())
        break
    }

    if (!hasRequiredFields) return

    const success = await signIn(loginData, 'student')

    if (success) {
      router.push('/student')
    } else {
      // Track failed method and show alternatives
      setAttemptedMethods(prev => new Set(prev).add(currentMethod))
      setShowAlternatives(true)
    }
  }

  const switchMethod = (method: AuthMethod) => {
    setCurrentMethod(method)
    clearLoginError()
    // Clear previous method's data
    if (method !== 'phone') updateLoginData({ phoneNumber: '' })
    if (method !== 'email') updateLoginData({ email: '' })
    if (method !== 'name') updateLoginData({ firstName: '', lastName: '' })
  }

  const getMethodTitle = (method: AuthMethod) => {
    switch (method) {
      case 'phone': return 'Login with Phone Number'
      case 'email': return 'Login with Email'
      case 'name': return 'Login with Full Name'
    }
  }

  const getMethodDescription = (method: AuthMethod) => {
    switch (method) {
      case 'phone': return 'Enter your student number and phone number'
      case 'email': return 'Enter your student number and email address'
      case 'name': return 'Enter your student number, first and last name'
    }
  }

  const renderMethodForm = (method: AuthMethod) => {
    switch (method) {
      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="0712345678"
                value={loginData.phoneNumber || ''}
                onChange={(e) => updateLoginData({ phoneNumber: e.target.value })}
                disabled={isLoggingIn}
                required
              />
            </div>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@email.com"
                value={loginData.email || ''}
                onChange={(e) => updateLoginData({ email: e.target.value })}
                disabled={isLoggingIn}
                required
              />
            </div>
          </div>
        )

      case 'name':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={loginData.firstName || ''}
                  onChange={(e) => updateLoginData({ firstName: e.target.value })}
                  disabled={isLoggingIn}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={loginData.lastName || ''}
                  onChange={(e) => updateLoginData({ lastName: e.target.value })}
                  disabled={isLoggingIn}
                  required
                />
              </div>
            </div>
          </div>
        )
    }
  }

  const availableMethods: AuthMethod[] = ['phone', 'email', 'name']
  const alternativeMethods = availableMethods.filter(method => method !== currentMethod)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Student Access</CardTitle>
          <CardDescription>
            {getMethodDescription(currentMethod)}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Number - Always visible */}
            <div>
              <Label htmlFor="studentNumber">Student Number</Label>
              <Input
                id="studentNumber"
                type="text"
                placeholder="STU001"
                value={loginData.studentNumber || ''}
                onChange={(e) => updateLoginData({ studentNumber: e.target.value.toUpperCase() })}
                disabled={isLoggingIn}
                required
              />
            </div>

            {/* Current method form */}
            {renderMethodForm(currentMethod)}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </Button>

            {/* Error display */}
            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            {/* Alternative methods */}
            {(showAlternatives || attemptedMethods.size > 0) && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Can't access your account?
                  </span>
                  {showAlternatives ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                {showAlternatives && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Try a different verification method:
                    </p>
                    {alternativeMethods.map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => switchMethod(method)}
                        disabled={isLoggingIn}
                      >
                        {getMethodTitle(method)}
                        {attemptedMethods.has(method) && (
                          <span className="ml-auto text-xs text-gray-500">
                            Tried
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staff login link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Staff member?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push('/staff-login')}
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