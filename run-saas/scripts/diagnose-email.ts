// scripts/diagnose-email.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("🔍 Email Configuration Diagnostics\n");
console.log("=".repeat(60));

// Check environment variables
console.log("\n📋 Environment Variables Check:");
console.log("=".repeat(60));

const requiredVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
];
let missingVars = false;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    if (varName === "SMTP_PASSWORD") {
      console.log(
        `✅ ${varName}: ${"*".repeat(Math.min(value.length, 20))} (${value.length} chars)`,
      );
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    missingVars = true;
  }
});

if (missingVars) {
  console.log("\n⚠️  Missing environment variables!");
  console.log("Please add to your .env file:");
  console.log("\nSMTP_HOST=mail.jaribu.org");
  console.log("SMTP_PORT=465");
  console.log("SMTP_USER=no-reply@jaribu.org");
  console.log("SMTP_PASSWORD=your-password");
  console.log('SMTP_FROM="Weekend Academy <no-reply@jaribu.org>"');
  process.exit(1);
}

// Test SMTP connection
console.log("\n📡 Testing SMTP Connection:");
console.log("=".repeat(60));

const host = process.env.SMTP_HOST || "mail.jaribu.org";
const port = parseInt(process.env.SMTP_PORT || "465");

console.log(`Connecting to ${host}:${port}...`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  logger: true,
  debug: true,
});

async function diagnose() {
  try {
    console.log("\n⏳ Verifying connection...");
    await transporter.verify();
    console.log("✅ SMTP connection successful!");

    console.log("\n📧 Attempting to send test email...");

    const testEmail = process.env.SMTP_USER || "test@example.com";

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `Weekend Academy <${testEmail}>`,
      to: testEmail,
      subject: "🧪 Email Test - Weekend Academy",
      html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #10b981;">✅ Email Test Successful!</h1>
                    <p>If you're reading this, your email configuration is working correctly.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <h2>Configuration Details:</h2>
                    <ul>
                        <li><strong>SMTP Host:</strong> ${host}</li>
                        <li><strong>SMTP Port:</strong> ${port}</li>
                        <li><strong>SMTP User:</strong> ${process.env.SMTP_USER}</li>
                        <li><strong>From:</strong> ${process.env.SMTP_FROM}</li>
                    </ul>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        This is an automated test email from the Weekend Academy email diagnostic script.
                    </p>
                </div>
            `,
      text: `Email Test Successful!\n\nIf you're reading this, your email configuration is working correctly.\n\nConfiguration:\n- SMTP Host: ${host}\n- SMTP Port: ${port}\n- SMTP User: ${process.env.SMTP_USER}\n- From: ${process.env.SMTP_FROM}`,
    });

    console.log("✅ Test email sent successfully!");
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Check your inbox: ${testEmail}`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All checks passed! Email service is working correctly.");
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ Email diagnostic failed!");
    console.error("\nError details:");
    console.error("  Code:", error.code || "N/A");
    console.error("  Command:", error.command || "N/A");
    console.error("  Message:", error.message || "N/A");

    console.log("\n💡 Troubleshooting suggestions:\n");

    if (error.code === "ETIMEDOUT") {
      console.log("⏱️  Connection timeout:");
      console.log(
        "  1. Check if your firewall/antivirus is blocking port",
        port,
      );
      console.log("  2. Verify SMTP_HOST is correct:", host);
      console.log("  3. Check if your ISP blocks SMTP ports");
      console.log("  4. Try using a VPN");
    } else if (error.code === "EAUTH" || error.responseCode === 535) {
      console.log("🔐 Authentication failed:");
      console.log("  1. Double-check SMTP_USER and SMTP_PASSWORD");
      console.log(
        "  2. Verify your account credentials with the SMTP provider",
      );
    } else if (error.code === "ECONNREFUSED") {
      console.log("🚫 Connection refused:");
      console.log("  1. Wrong SMTP_HOST or SMTP_PORT");
      console.log("  2. SMTP service might be down");
      console.log("  3. Try switching secure mode (465 vs 587)");
    } else {
      console.log("❓ Unknown error. Common fixes:");
      console.log("  1. Verify all environment variables are set correctly");
      console.log("  2. Restart your dev server after updating .env");
      console.log("  3. Contact your email provider for support");
    }

    console.log("\n=".repeat(60));

    process.exit(1);
  }
}

diagnose();
