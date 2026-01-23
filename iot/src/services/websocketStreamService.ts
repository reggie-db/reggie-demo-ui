// WebSocket Stream Service
// Utilities for building stream messages

import { getClientId } from './idService';

/**
 * Build WebSocket message payload for image/stream data
 * @param dataUrl - Base64 data URL of the image
 * @param width - Image width
 * @param height - Image height
 * @param streamId - Stream ID (defaults to client ID if not provided)
 * @param publicIP - Optional public IP address
 * @returns Message payload object
 */
export function buildStreamMessage(
    dataUrl: string,
    width: number,
    height: number,
    streamId?: string,
    publicIP?: string | null
): string {
    const clientId = getClientId();
    const finalStreamId = streamId?.trim() || clientId;

    const headers: Array<{ key: string; value: string }> = [
        { key: 'client_id', value: clientId },
        { key: 'stream_id', value: finalStreamId },
        { key: 'width', value: String(width) },
        { key: 'height', value: String(height) },
    ];

    if (publicIP) {
        headers.push({ key: 'public_ip', value: publicIP });
    }

    const message = {
        headers,
        key: { value: 'foo', format: 'string' },
        value: { value: dataUrl, format: 'string' },
        messageId: `${clientId}_${Date.now()}`,
    };

    return JSON.stringify(message);
}
