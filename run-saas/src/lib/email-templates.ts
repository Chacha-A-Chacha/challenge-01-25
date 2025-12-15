// lib/email-templates.ts

/**
 * Base HTML wrapper for all emails
 */
function emailWrapper(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekend Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #2563eb; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">Weekend Academy</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                © ${new Date().getFullYear()} Weekend Academy. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                If you have questions, contact us at support@weekendacademy.com
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim()
}

/**
 * Button component
 */
function button(text: string, url: string, color: string = '#2563eb'): string {
    return `
<table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td align="center" style="padding: 20px 0;">
            <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                ${text}
            </a>
        </td>
    </tr>
</table>
    `.trim()
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD RESET TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

interface PasswordResetData {
    name: string
    resetUrl: string
    expiryMinutes: number
}

export function passwordResetTemplate({ name, resetUrl, expiryMinutes }: PasswordResetData): string {
    const content = `
<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">Password Reset Request</h2>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Hi ${name},
</p>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    We received a request to reset your password for your Weekend Academy account.
</p>
${button('Reset Password', resetUrl)}
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    This link will expire in <strong>${expiryMinutes} minutes</strong> for security reasons.
</p>
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't be changed.
    </p>
</div>
<p style="margin: 0; color: #6b7280; font-size: 14px;">
    Or copy and paste this URL into your browser:<br>
    <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
</p>
    `.trim()
    
    return emailWrapper(content)
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD CHANGED CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════

interface PasswordChangedData {
    name: string
    changedAt: string
}

export function passwordChangedTemplate({ name, changedAt }: PasswordChangedData): string {
    const content = `
<div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; width: 64px; height: 64px; background-color: #d1fae5; border-radius: 50%; line-height: 64px;">
        <span style="color: #059669; font-size: 32px;">✓</span>
    </div>
</div>
<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; text-align: center;">Password Changed Successfully</h2>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Hi ${name},
</p>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Your password was successfully changed on ${changedAt}.
</p>
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Didn't make this change?</strong> Please contact support immediately at support@weekendacademy.com
    </p>
</div>
<p style="margin: 0; color: #6b7280; font-size: 14px;">
    If you have any concerns, please reach out to our support team.
</p>
    `.trim()
    
    return emailWrapper(content)
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION APPROVAL
// ═══════════════════════════════════════════════════════════════════════════

interface RegistrationApprovedData {
    name: string
    studentNumber: string
    courseName: string
    className: string
    loginUrl: string
}

export function registrationApprovedTemplate({
    name,
    studentNumber,
    courseName,
    className,
    loginUrl
}: RegistrationApprovedData): string {
    const content = `
<div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; width: 64px; height: 64px; background-color: #d1fae5; border-radius: 50%; line-height: 64px;">
        <span style="color: #059669; font-size: 32px;">✓</span>
    </div>
</div>
<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; text-align: center;">Registration Approved!</h2>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Hi ${name},
</p>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Great news! Your registration has been approved. Welcome to Weekend Academy!
</p>
<div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
    <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
            <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Student Number:</td>
            <td style="color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${studentNumber}</td>
        </tr>
        <tr>
            <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Course:</td>
            <td style="color: #111827; font-size: 14px; text-align: right;">${courseName}</td>
        </tr>
        <tr>
            <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Class:</td>
            <td style="color: #111827; font-size: 14px; text-align: right;">${className}</td>
        </tr>
    </table>
</div>
${button('Sign In to Your Account', loginUrl, '#059669')}
<p style="margin: 0; color: #6b7280; font-size: 14px;">
    You can now access your student portal using your email and the password you created during registration.
</p>
    `.trim()
    
    return emailWrapper(content)
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION REJECTION
// ═══════════════════════════════════════════════════════════════════════════

interface RegistrationRejectedData {
    name: string
    reason: string
    supportEmail: string
}

export function registrationRejectedTemplate({
    name,
    reason,
    supportEmail
}: RegistrationRejectedData): string {
    const content = `
<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">Registration Update</h2>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Hi ${name},
</p>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    We've reviewed your registration application and unfortunately we're unable to approve it at this time.
</p>
<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">
        Reason:
    </p>
    <p style="margin: 0; color: #991b1b; font-size: 14px;">
        ${reason}
    </p>
</div>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    If you believe this is an error or would like to discuss your application, please contact us at:
</p>
<p style="margin: 0; color: #2563eb; font-size: 16px; font-weight: 600;">
    ${supportEmail}
</p>
    `.trim()
    
    return emailWrapper(content)
}

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME EMAIL (Optional - for new teachers/admins)
// ═══════════════════════════════════════════════════════════════════════════

interface WelcomeData {
    name: string
    role: string
    loginUrl: string
    email: string
    temporaryPassword?: string
}

export function welcomeTemplate({ name, role, loginUrl, email, temporaryPassword }: WelcomeData): string {
    const content = `
<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">Welcome to Weekend Academy!</h2>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Hi ${name},
</p>
<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
    Your ${role} account has been created. You can now access the Weekend Academy portal.
</p>
<div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Login Credentials:</p>
    <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
            <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Email:</td>
            <td style="color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${email}</td>
        </tr>
        ${temporaryPassword ? `
        <tr>
            <td style="color: #6b7280; font-size: 14px; font-weight: 600;">Temporary Password:</td>
            <td style="color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${temporaryPassword}</td>
        </tr>
        ` : ''}
    </table>
</div>
${temporaryPassword ? `
<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important:</strong> Please change your password after your first login.
    </p>
</div>
` : ''}
${button('Sign In Now', loginUrl)}
    `.trim()
    
    return emailWrapper(content)
}
