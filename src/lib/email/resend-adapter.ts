import { Resend } from 'resend';
import type { SendEmailOptions } from 'payload';

/**
 * Resend Email Adapter for PayloadCMS
 * 
 * Setup:
 * 1. Sign up at https://resend.com (FREE: 100 emails/day, 3,000/month)
 * 2. Get API key from dashboard
 * 3. Add to environment: RESEND_API_KEY=re_xxxxx
 * 4. Verify domain or use onboarding@resend.dev for testing
 */

export interface ResendAdapterArgs {
  apiKey: string;
  defaultFromAddress: string;
  defaultFromName?: string;
}

export const resendAdapter = ({
  apiKey,
  defaultFromAddress,
  defaultFromName = 'Toolbay',
}: ResendAdapterArgs) => {
  const resend = new Resend(apiKey);

  // Return a function that returns the adapter object
  return () => ({
    name: 'resend',
    defaultFromAddress,
    defaultFromName,
    
    sendEmail: async (message: SendEmailOptions) => {
      try {
        const result = await resend.emails.send({
          from: message.from || `${defaultFromName} <${defaultFromAddress}>`,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          replyTo: message.replyTo as string | undefined,
          cc: message.cc as string | string[] | undefined,
          bcc: message.bcc as string | string[] | undefined,
        });

        console.log('[Resend] Email sent successfully:', result.data?.id);
        
        return result;
      } catch (error: any) {
        console.error('[Resend] Email send failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }
    },
  });
};
