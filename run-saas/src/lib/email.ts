// lib/email.ts
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter with jaribu.org SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // true for 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify connection on startup
if (process.env.NODE_ENV === "development") {
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ Email service connection failed:", error);
    } else {
      console.log("✅ Email service ready");
    }
  });
}

/**
 * Send email via SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("❌ Email not configured - missing SMTP credentials");
      console.log(
        "⚠️  Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in .env",
      );
      return false;
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "Weekend Academy <no-reply@jaribu.org>",
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    console.log("📧 Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    console.log("Failed to send email to:", to);

    console.log("\n📋 Email Configuration:");
    console.log("  SMTP_HOST:", process.env.SMTP_HOST || "✗ Missing");
    console.log("  SMTP_PORT:", process.env.SMTP_PORT || "✗ Missing");
    console.log("  SMTP_USER:", process.env.SMTP_USER ? "✓ Set" : "✗ Missing");
    console.log(
      "  SMTP_PASSWORD:",
      process.env.SMTP_PASSWORD ? "✓ Set" : "✗ Missing",
    );
    console.log("  SMTP_FROM:", process.env.SMTP_FROM || "✗ Missing");

    return false;
  }
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate email configuration on server start
 */
export function validateEmailConfig(): boolean {
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn("⚠️  Missing email config:", missing.join(", "));
    return false;
  }

  return true;
}
