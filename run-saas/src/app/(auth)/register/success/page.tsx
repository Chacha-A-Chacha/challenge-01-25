// app/(auth)/register/success/page.tsx
import { Metadata } from 'next'
import { RegistrationSuccess } from '@/components/registration'

export const metadata: Metadata = {
    title: 'Registration Submitted | Weekend Academy',
    description: 'Your registration has been submitted successfully'
}

export default function RegistrationSuccessPage() {
    return <RegistrationSuccess />
}
