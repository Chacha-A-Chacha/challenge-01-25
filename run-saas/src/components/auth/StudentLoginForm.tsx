// components/auth/StudentLoginForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'

type AuthMethod = 'phone' | 'email' | 'name'

interface StudentCredentials {
  studentNumber: string
  phoneNumber?: string
  email?: string
  firstName?: string
  lastName?: string
}

export function StudentLoginForm() {
  const router = useRouter()
  
  const [credentials, setCredentials] = useState<StudentCredentials>({
    studentNumber: ''
  })
  const [currentMethod, setCurrentMethod] = useState<AuthMethod>('phone')
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [attemptedMethods, setAttemptedMethods] = useState<Set<AuthMethod>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('student', {
        redirect: false,
        studentNumber: credentials.studentNumber,
        phoneNumber: credentials.phoneNumber || '',
        email: credentials.email || '',
        firstName: credentials.firstName || '',
        lastName: credentials.lastName || ''
      })

      if (result?.error) {
        setError('Login failed. Please check your information.')
        setAttemptedMethods(prev => new Set(prev).add(currentMethod))
        setShowAlternatives(true)
      } else if (result?.ok) {
        router.push('/student')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMethod = (method: AuthMethod) => {
    setCurrentMethod(method)
    setError(null)
    // Clear previous method data
    setCredentials(prev => ({
      studentNumber: prev.studentNumber,
      ...(method === 'phone' && { phoneNumber: '' }),
      ...(method === 'email' && { email: '' }),
      ...(method === 'name' && { firstName: '', lastName: '' })
    }))
  }

  const updateField = (field: keyof StudentCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Student Access</CardTitle>
          <CardDescription>
            {currentMethod === 'phone' && 'Enter your student number and phone number'}
            {currentMethod === 'email' && 'Enter your student number and email address'}
            {currentMethod === 'name' && 'Enter your student number and full name'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="studentNumber">Student Number</Label>
              <Input
                id="studentNumber"
                type="text"
                placeholder="STU001"
                value={credentials.studentNumber}
                onChange={(e) => updateField('studentNumber', e.target.value.toUpperCase())}
                disabled={isLoading}
                required
              />
            </div>

            {currentMethod === 'phone' && (
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0712345678"
                  value={credentials.phoneNumber || ''}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {currentMethod === 'email' && (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@email.com"
                  value={credentials.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {currentMethod === 'name' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={credentials.firstName || ''}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={credentials.lastName || ''}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                    Can&#39;t access your account?
                  </span>
                  {showAlternatives ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                {showAlternatives && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Try a different verification method:</p>
                    {(['phone', 'email', 'name'] as AuthMethod[])
                      .filter(method => method !== currentMethod)
                      .map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => switchMethod(method)}
                        >
                          {method === 'phone' && 'Login with Phone Number'}
                          {method === 'email' && 'Login with Email'}
                          {method === 'name' && 'Login with Full Name'}
                          {attemptedMethods.has(method) && (
                            <span className="ml-auto text-xs text-gray-500">Tried</span>
                          )}
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            )}

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
