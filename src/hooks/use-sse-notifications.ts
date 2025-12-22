'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { notificationService } from '@/lib/notifications/browser-notifications';
import { formatCurrency } from '@/lib/utils';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  status?: string;
  createdAt: string;
}

interface OrderData {
  id: string;
  orderId: string;
  status: string;
  total?: number;
  updatedAt: string;
}

interface MessageData {
  id: string;
  sender: string;
  text: string;
  conversationId: string;
  createdAt: string;
}

interface UseSSENotificationsOptions {
  userId?: string;
  enabled?: boolean;
  playSound?: boolean;
  onPayment?: (payment: PaymentData) => void;
  onOrder?: (order: OrderData) => void;
  onMessage?: (message: MessageData) => void;
  onError?: (error: Event) => void;
}

export function useSSENotifications({
  userId,
  enabled = true,
  playSound = true,
  onPayment,
  onOrder,
  onMessage,
  onError
}: UseSSENotificationsOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Play notification sound
  const playNotificationSound = useCallback((type: 'payment' | 'order' | 'message') => {
    if (!playSound) return;
    
    try {
      const soundMap = {
        payment: '/sounds/payment.mp3',
        order: '/sounds/order.mp3',
        message: '/sounds/message.mp3'
      };
      
      const audio = new Audio(soundMap[type]);
      audio.play().catch(err => console.warn('Could not play sound:', err));
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }, [playSound]);

  const connect = useCallback(() => {
    if (!userId || !enabled) {
      console.log('[SSE] Not connecting - userId or enabled is false');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log(`[SSE] Connecting for user: ${userId}`);
    setConnectionError(null);
    
    try {
      // Create new EventSource connection
      const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);
      eventSourceRef.current = eventSource;

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('[SSE] Connected successfully');
              setIsConnected(true);
              setConnectionError(null);
              reconnectAttempts.current = 0;
              break;
              
            case 'payment':
              console.log('[SSE] New payment:', data.data);
              
              // Show browser notification
              const amount = `${data.data.currency} ${data.data.amount.toLocaleString()}`;
              notificationService.showPaymentNotification(amount, data.data.id);
              
              // Play sound
              playNotificationSound('payment');
              
              // Trigger callback
              onPayment?.(data.data);
              break;
              
            case 'order':
              console.log('[SSE] Order update:', data.data);
              
              // Show browser notification
              notificationService.showOrderNotification(
                data.data.orderId,
                data.data.status,
                data.data.id
              );
              
              // Play sound
              playNotificationSound('order');
              
              // Trigger callback
              onOrder?.(data.data);
              break;
              
            case 'message':
              console.log('[SSE] New message:', data.data);
              
              // Show browser notification
              notificationService.showChatNotification(
                data.data.sender,
                data.data.text,
                data.data.conversationId
              );
              
              // Play sound
              playNotificationSound('message');
              
              // Trigger callback
              onMessage?.(data.data);
              break;
              
            default:
              console.log('[SSE] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      // Handle errors and reconnection
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        setIsConnected(false);
        eventSource.close();
        
        // Exponential backoff for reconnection
        const maxBackoff = 30000; // 30 seconds max
        const backoffTime = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current), 
          maxBackoff
        );
        
        reconnectAttempts.current++;
        
        const errorMessage = `Connection lost. Reconnecting in ${Math.round(backoffTime / 1000)}s (attempt ${reconnectAttempts.current})`;
        console.log(`[SSE] ${errorMessage}`);
        setConnectionError(errorMessage);
        
        // Trigger error callback
        onError?.(error);
        
        // Schedule reconnection
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[SSE] Attempting to reconnect...');
          connect();
        }, backoffTime);
      };

      // Handle connection open
      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
        setIsConnected(true);
        setConnectionError(null);
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setConnectionError('Failed to establish connection');
      setIsConnected(false);
    }
  }, [userId, enabled, onPayment, onOrder, onMessage, onError, playNotificationSound]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && userId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log('[SSE] Disconnecting...');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [connect, enabled, userId]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    isConnected,
    connectionError,
    reconnect,
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    }
  };
}
