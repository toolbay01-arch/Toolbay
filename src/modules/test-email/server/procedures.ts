import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Test SMTP Configuration
 * Temporary router to diagnose email issues
 */
export const testEmailRouter = createTRPCRouter({
  /**
   * Check SMTP configuration without sending email
   */
  checkConfig: baseProcedure.query(async () => {
    return {
      configured: {
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_PORT: !!process.env.SMTP_PORT,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        SMTP_FROM_EMAIL: !!process.env.SMTP_FROM_EMAIL,
      },
      values: {
        SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
        SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
        SMTP_USER: process.env.SMTP_USER || 'NOT SET',
        SMTP_PASS: process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 4)}****` : 'NOT SET',
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'NOT SET',
      }
    };
  }),

  /**
   * Test sending an actual email
   */
  sendTest: baseProcedure.mutation(async () => {
    const payload = await getPayload({ config });
    
    console.log('[testEmail] Starting email test...');
    console.log('[testEmail] SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 4)}****` : 'NOT SET',
      from: process.env.SMTP_FROM_EMAIL,
    });

    try {
      const startTime = Date.now();
      
      await payload.sendEmail({
        to: process.env.SMTP_USER || 'test@example.com', // Send to yourself for testing
        subject: '🧪 Test Email from Toolbay',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Test Email</title>
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>✅ Email Configuration Working!</h1>
              <p>This is a test email from your Toolbay application.</p>
              <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
              <p><strong>Environment:</strong> Production</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                If you received this email, your SMTP configuration is correct!
              </p>
            </body>
          </html>
        `,
      });

      const duration = Date.now() - startTime;
      console.log(`[testEmail] Email sent successfully in ${duration}ms`);

      return {
        success: true,
        message: `Test email sent successfully in ${duration}ms! Check your inbox at ${process.env.SMTP_USER}`,
        duration,
      };
    } catch (error: any) {
      console.error('[testEmail] Email send failed:', error);
      console.error('[testEmail] Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Email send failed: ${error.message}`,
        error: {
          message: error.message,
          code: error.code,
          command: error.command,
        },
      };
    }
  }),
});
