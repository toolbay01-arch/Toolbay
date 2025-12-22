import { getPayload } from "payload";
import config from "@payload-config";
import crypto from "crypto";

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get token expiration time (24 hours from now)
 */
export function getTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  username: string
): Promise<void> {
  const payload = await getPayload({ config });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  await payload.sendEmail({
    to: email,
    subject: "Verify your Toolbay account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f0;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Toolbay</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome to Toolbay, ${username}!</h2>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Thank you for signing up. To complete your registration and start using your account, please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #999999; word-break: break-all; font-size: 12px; margin: 10px 0 20px 0;">
                ${verificationUrl}
              </p>
              
              <div style="border-top: 1px solid #eeeeee; margin: 30px 0; padding-top: 20px;">
                <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Note:</strong> This link will expire in 24 hours. If you didn't create an account with Toolbay, please ignore this email.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f4f4f0; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Toolbay. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  username: string
): Promise<void> {
  const payload = await getPayload({ config });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await payload.sendEmail({
    to: email,
    subject: "Reset your Toolbay password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f0;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Toolbay</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Hi ${username}, we received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666666; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #999999; word-break: break-all; font-size: 12px; margin: 10px 0 20px 0;">
                ${resetUrl}
              </p>
              
              <div style="border-top: 1px solid #eeeeee; margin: 30px 0; padding-top: 20px;">
                <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Note:</strong> This link will expire in 24 hours. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f4f4f0; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Toolbay. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
