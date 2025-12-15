// lib/email.ts
import nodemailer from 'nodemailer'

interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

// Create transporter with Brevo SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
})

// Verify connection on startup (optional, for debugging)
if (process.env.NODE_ENV === 'development') {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service connection failed:', error)
        } else {
            console.log('✅ Email service ready')
        }
    })
}

/**
 * Send email via Brevo SMTP
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Weekend Academy <noreply@weekendacademy.com>',
            to,
            subject,
            html,
            text: text || stripHtml(html), // Fallback plain text
        })

        console.log('📧 Email sent:', info.messageId)
        return true
    } catch (error) {
        console.error('❌ Email send failed:', error)
        return false
    }
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Validate email configuration on server start
 */
export function validateEmailConfig(): boolean {
    const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
        console.warn('⚠️  Missing email config:', missing.join(', '))
        return false
    }
    
    return true
}
