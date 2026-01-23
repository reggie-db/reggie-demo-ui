// WebSocket Service
// Handles WebSocket connections and message parsing for real-time events

import toast from 'react-hot-toast';
import { WebSocketClient } from './websocketClient';

/**
 * WebSocket message format from the backend
 */
export interface WebSocketMessage {
  wsProxyMessageId: string;
  topic: string;
  partition: number;
  offset: number;
  timestamp: number;
  headers: any;
  key: {
    value: string;
    format: string;
  };
  value: {
    value: string;
    format: string;
  };
}

/**
 * Rate limiting: Track last notification time
 * Only show 1 notification per 3 seconds, drop others
 */
let lastNotificationTime = 0;
const RATE_LIMIT_MS = 3000; // 3 seconds

/**
 * Store the current WebSocket client instance
 */
let wsClient: WebSocketClient | null = null;
let unsubscribe: (() => void) | null = null;

/**
 * Parse WebSocket message and show notification
 * Rate limited to 1 notification per 3 seconds
 */
const handleWebSocketMessage = (event: MessageEvent, onNewAlert?: (alert: any) => void) => {
  try {
    const message: WebSocketMessage = JSON.parse(event.data);

    // Rate limiting: Check if enough time has passed since last notification
    const now = Date.now();
    if (now - lastNotificationTime < RATE_LIMIT_MS) {
      // Drop this message - too soon since last notification
      console.log('Dropping WebSocket message due to rate limit');
      return;
    }

    // Parse the value.value JSON string
    if (message.value && message.value.value) {
      try {
        const parsedValue = JSON.parse(message.value.value);

        // Update last notification time
        lastNotificationTime = now;

        // Create alert object for notifications panel
        const alert = {
          storeId: parsedValue.store_id || 'Unknown',
          detectionLabel: parsedValue.label || parsedValue.detection_type || 'Event',
          timestamp: new Date(message.timestamp || Date.now()),
          data: parsedValue,
        };

        // Notify parent component if callback provided
        if (onNewAlert) {
          onNewAlert(alert);
        }

        // Toast notifications removed - no longer showing "New Event" toasts
      } catch (parseError) {
        console.error('Failed to parse value.value JSON:', parseError);
        toast.error('Failed to parse WebSocket message value');
      }
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
    toast.error('Failed to parse WebSocket message');
  }
};

/**
 * Set whether toasts should be shown (no-op, kept for compatibility)
 * @param enabled - Whether toasts are enabled
 */
export const setToastsEnabled = (_enabled: boolean): void => {
  // No-op: toasts are handled elsewhere
};

/**
 * Close the current WebSocket connection
 */
export const closeWebSocket = (): void => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
};

/**
 * Initialize WebSocket connection
 * @param onNewAlert - Callback for new alerts (replaces mock detection alerts)
 * @param enabled - Whether toasts should be shown (default: true)
 * @returns WebSocket instance and cleanup function
 */
export const initializeWebSocket = (
  onNewAlert?: (alert: any) => void,
  _enabled: boolean = true
): { ws: WebSocket | null; cleanup: () => void } => {
  // Close any existing connection
  closeWebSocket();

  // Create new WebSocket client for "out" endpoint with "sink" topic
  wsClient = new WebSocketClient(true, 'sink');

  // Subscribe to messages
  unsubscribe = wsClient.subscribe((event) => {
    handleWebSocketMessage(event, onNewAlert);
  });

  // Connect
  wsClient.connect();

  return {
    ws: null, // Not exposing internal WebSocket
    cleanup: () => {
      closeWebSocket();
    },
  };
};
