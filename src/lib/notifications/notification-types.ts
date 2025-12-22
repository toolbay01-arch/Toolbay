/**
 * Notification type definitions for browser notifications
 */

export type NotificationType = 
  | 'payment'
  | 'order'
  | 'chat'
  | 'product'
  | 'transaction';

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: {
    url?: string;
    type?: NotificationType;
    id?: string;
    [key: string]: any;
  };
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  url?: string;
  id?: string;
  tag?: string;
  data?: Record<string, any>;
}
