// Service Utilities
// Shared utilities for service calls including session management and header generation

import { API_BASE_URL, API_CONFIG, getAuthHeaders } from './config';

/**
 * Generate or retrieve a session identifier
 * Session ID persists for the browser session and is stored in sessionStorage
 */
const getSessionId = (): string => {
    const storageKey = 'react_session_id';
    let sessionId = sessionStorage.getItem(storageKey);

    if (!sessionId) {
        // Generate a unique session ID using timestamp and random string
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
};

/**
 * Build headers for API requests including session ID and authentication
 * @param additionalHeaders - Optional additional headers to merge in
 * @returns HeadersInit object with all required headers
 */
export const buildRequestHeaders = (additionalHeaders?: HeadersInit): HeadersInit => {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-REACT-SESSION-ID": getSessionId(),
        ...additionalHeaders,
    };

    return headers;
};

/**
 * Console logging styles for API calls
 */
const LOG_STYLES = {
    api: "color: #10b981; font-weight: bold",
    success: "color: #10b981",
    error: "color: #ef4444",
    info: "color: #64748b",
};

/**
 * Helper function to make API calls with error handling
 * Handles both standard API responses ({success: true, data: <data>}) and direct responses (like /api/search)
 * @param endpoint - API endpoint path
 * @param options - Optional fetch options
 * @returns Promise resolving to the response data (extracted from wrapper if present)
 */
export const apiCall = async <T = any>(
    endpoint: string,
    options?: RequestInit,
): Promise<T> => {
    const finalOptions = options || {};
    const url = `${API_BASE_URL}${endpoint}`;
    const startTime = performance.now();

    // Log the API request
    console.log(
        `%c[API] %cRequest → %c${finalOptions.method || "GET"} ${endpoint}`,
        LOG_STYLES.api,
        LOG_STYLES.info,
        "",
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
        const response = await fetch(url, {
            ...finalOptions,
            headers: buildRequestHeaders({
                ...getAuthHeaders(),
                ...finalOptions.headers,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Math.round(performance.now() - startTime);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                success: false,
                error: {
                    code: "UNKNOWN_ERROR",
                    message: `HTTP ${response.status}: ${response.statusText}`,
                },
            }));

            console.log(
                `%c[API] %cResponse ✗ %c${endpoint} %c(${duration}ms) %c${response.status}`,
                LOG_STYLES.api,
                LOG_STYLES.error,
                LOG_STYLES.info,
                "",
                LOG_STYLES.error,
            );
            console.error("Error:", errorData);

            throw new Error(
                errorData.error?.message || `API Error: ${response.status}`,
            );
        }

        const responseData = await response.json();

        console.log(
            `%c[API] %cResponse ✓ %c${endpoint} %c(${duration}ms)`,
            LOG_STYLES.api,
            LOG_STYLES.success,
            LOG_STYLES.info,
            "",
        );
        console.log("Data:", responseData);

        // Handle different response formats:
        // 1. Standard format: {success: true, data: <actual data>} - extract data.data
        // 2. Direct format (like /api/search): response is the data itself - return as-is
        if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
            // Standard wrapped response format
            return responseData.data as T;
        } else {
            // Direct response format (e.g., /api/search)
            return responseData as T;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        const duration = Math.round(performance.now() - startTime);

        if (error instanceof Error) {
            if (error.name === "AbortError") {
                console.log(
                    `%c[API] %cTimeout ✗ %c${endpoint} %c(${duration}ms)`,
                    LOG_STYLES.api,
                    LOG_STYLES.error,
                    LOG_STYLES.info,
                    "",
                );
                throw new Error("Request timeout - please try again");
            }

            console.log(
                `%c[API] %cError ✗ %c${endpoint} %c(${duration}ms)`,
                LOG_STYLES.api,
                LOG_STYLES.error,
                LOG_STYLES.info,
                "",
            );
            console.error("Error:", error);

            throw error;
        }

        throw new Error("An unexpected error occurred");
    }
};

