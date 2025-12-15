// components/auth/StudentLoginForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react'

export function StudentLoginForm() {
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const result = await signIn('student', {
                redirect: false,
                email: email.toLowerCase().trim(),
                password
            })

            if (result?.error) {
                setError('Invalid email or password. Please try again.')
            } else if (result?.ok) {
                router.push('/student')
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 px-4 py-8">
            <div className="w-full max-w-md">
                <Card className="border-blue-100 shadow-xl">
                    <CardHeader className="space-y-4 pb-6">
                        {/* Logo and Title */}
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600">
                                <GraduationCap className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Weekend Academy</h1>
                                <div className="inline-flex items-center gap-2 mt-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    <span className="text-sm font-medium text-blue-700">Student Portal</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <CardTitle className="text-xl font-semibold">Welcome Back</CardTitle>
                            <CardDescription className="mt-1.5">
                                Sign in to access your attendance portal
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="student@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        Password
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="p-0 h-auto text-xs text-blue-600 hover:text-blue-700"
                                        onClick={() => router.push('/forgot-password')}
                                    >
                                        Forgot password?
                                    </Button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                    className="h-11"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive" className="py-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-medium" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Registration Section */}
                        <div className="pt-4 border-t">
                            <p className="text-center text-sm text-gray-600">
                                New to Weekend Academy?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-sm font-semibold text-blue-600 hover:text-blue-700"
                                    onClick={() => router.push('/register')}
                                >
                                    Create an account
                                </Button>
                            </p>
                        </div>

                        {/* Staff Link */}
                        <div className="pt-4 border-t">
                            <p className="text-center text-xs text-gray-500">
                                Staff member?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-xs text-gray-700 hover:text-gray-900 font-medium"
                                    onClick={() => router.push('/staff-login')}
                                >
                                    Access staff portal →
                                </Button>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    © {new Date().getFullYear()} Weekend Academy. All rights reserved.
                </p>
            </div>
        </div>
    )
}
