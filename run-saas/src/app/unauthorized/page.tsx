// app/unauthorized/page.tsx - Unauthorized Access Page
import { Metadata } from 'next'
import { AccessDenied } from '@/components/auth/AccessDenied'

export const metadata: Metadata = {
  title: 'Access Denied | Weekend Academy',
  description: 'You do not have permission to access this page'
}

export default function UnauthorizedPage() {
  return (
    <AccessDenied
      message="You don't have permission to access the requested page."
      showHomeLink={true}
    />
  )
}
