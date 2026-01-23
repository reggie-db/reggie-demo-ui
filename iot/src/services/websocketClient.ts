// WebSocket Client
// Simple WebSocket client for "in" and "out" endpoints

import { getClientId } from './idService';

type MessageHandler = (event: MessageEvent) => void;

/**
 * Simple WebSocket client
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private shouldReconnect = true;
    private isConnecting = false;

    /**
     * Create a WebSocket client
     * @param isOut - true for "out" endpoint, false for "in" endpoint
     * @param topic - Topic name (e.g., "sink", "source")
     */
    constructor(isOut: boolean, topic: string) {
        const clientId = getClientId();
        const endpoint = isOut ? 'out' : 'in';
        this.url = `wss://kws.lfpconnect.io/${endpoint}?clientId=${encodeURIComponent(clientId)}&topic=${encodeURIComponent(topic)}${isOut ? `&keyType=string&offsetResetStrategy=latest` : ""}`;
    }

    /**
     * Connect to WebSocket
     */
    connect(): void {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.isConnecting = false;
                console.log('WebSocket connected:', this.url);
            };

            this.ws.onmessage = (event) => {
                this.messageHandlers.forEach((handler) => handler(event));
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                this.isConnecting = false;
                console.log('WebSocket closed:', this.url);

                if (this.shouldReconnect) {
                    this.reconnectTimeout = setTimeout(() => {
                        this.connect();
                    }, 500);
                }
            };
        } catch (error) {
            this.isConnecting = false;
            console.error('Failed to create WebSocket:', error);

            if (this.shouldReconnect) {
                this.reconnectTimeout = setTimeout(() => {
                    this.connect();
                }, 500);
            }
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        this.shouldReconnect = false;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Subscribe to messages
     * @param handler - Message handler function
     * @returns Unsubscribe function
     */
    subscribe(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);

        // Auto-connect if not already connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connect();
        }

        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    /**
     * Publish a message
     * @param message - Message to send (string or object)
     */
    publish(message: string | object): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, cannot publish');
            return;
        }

        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(messageStr);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

