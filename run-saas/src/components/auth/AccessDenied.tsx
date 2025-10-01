// components/auth/AccessDenied.tsx
'use client'

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface AccessDeniedProps {
  message?: string
  showHomeLink?: boolean
}

export function AccessDenied({
  message = "You don't have permission to access this page.",
  showHomeLink = true
}: AccessDeniedProps) {
  const { user } = useAuth()
  const router = useRouter()

  const handleGoHome = () => {
    const homePath = user?.role === 'admin' ? '/admin' :
                    user?.role === 'teacher' ? '/teacher' :
                    user?.role === 'student' ? '/student' : '/login'
    router.push(homePath)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {showHomeLink && (
          <Button
            onClick={handleGoHome}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  )
}