// scripts/test-email.ts
// Run with: npx tsx scripts/test-email.ts

import { sendEmail } from '@/lib/email'
import { passwordResetTemplate } from '@/lib/email-templates'

async function testEmail() {
    console.log('🧪 Testing email configuration...\n')

    const testData = {
        name: 'Test User',
        resetUrl: 'http://localhost:3000/reset-password?token=test123',
        expiryMinutes: 60
    }

    const html = passwordResetTemplate(testData)

    const success = await sendEmail({
        to: 'calex2607@gmail.com', // Replace with your test email
        subject: 'Test Email - Weekend Academy',
        html
    })

    if (success) {
        console.log('✅ Email sent successfully!')
        console.log('📧 Check your inbox at calex2607@gmail.com')
    } else {
        console.log('❌ Email failed to send')
        console.log('Check your .env configuration')
    }
}

testEmail()
