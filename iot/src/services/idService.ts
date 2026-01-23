// ID Generation Service
// Centralized utilities for generating client IDs and stream IDs

/**
 * Generate a UUID v4 using crypto.randomUUID() or fallback method
 * @returns A UUID string
 */
export const generateUUID = (): string => {
    // Fallback UUID v4 generation
    return "client_" + Math.random().toString(36).substring(2, 10);
};

/**
 * Generate a random name using adjective-color-animal pattern
 * @returns A random name string (e.g., "happy-blue-cat")
 */
export const generateRandomName = (): string => {
    const adjectives = ['happy', 'brave', 'calm', 'eager', 'gentle', 'jolly', 'kind', 'lively', 'merry', 'proud'];
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown', 'black', 'white'];
    const animals = ['cat', 'dog', 'bird', 'fish', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer'];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];

    return `${adjective}-${color}-${animal}`;
};

/**
 * Generate a client ID using UUID
 * Client IDs are generated once per session and stored in sessionStorage
 * @returns A client ID string
 */
export const getClientId = (): string => {
    const storageKey = 'websocket_client_id_2';
    let clientId = sessionStorage.getItem(storageKey);

    if (!clientId) {
        clientId = generateUUID();
        sessionStorage.setItem(storageKey, clientId);
    }

    return clientId;
};

/**
 * Generate a stream ID
 * Stream IDs are generated using a random name pattern (adjective-color-animal) and stored in localStorage
 * @param override - Optional override value for the stream ID
 * @returns A stream ID string
 */
export const getStreamId = (override?: string): string => {
    if (override && override.trim()) {
        return override.trim();
    }

    // Generate a default stream ID using random name pattern
    const storageKey = 'websocket_stream_id';
    let streamId = localStorage.getItem(storageKey);

    if (!streamId || streamId === 'undefined') {
        streamId = generateRandomName();
        localStorage.setItem(storageKey, streamId);
    }

    return streamId;
};

/**
 * Reset the stored stream ID (useful when user wants to generate a new one)
 */
export const resetStreamId = (): void => {
    localStorage.removeItem('websocket_stream_id');
};

/**
 * Generate a new stream ID and store it
 * @returns A new random stream ID
 */
export const generateNewStreamId = (): string => {
    const newStreamId = generateRandomName();
    localStorage.setItem('websocket_stream_id', newStreamId);
    return newStreamId;
};

