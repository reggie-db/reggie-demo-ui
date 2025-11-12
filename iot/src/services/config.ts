// Service Configuration
// Toggle between mock data and real API calls

/**
 * When true, services will return mock/dummy data for development
 * When false, services will make real API calls to the backend
 */
export const USE_MOCK_DATA = false;

/**
 * Base URL for the API server (defined in /openapi.yaml)
 * Change this based on your environment
 */
export const API_BASE_URL = "http://localhost:8000";

/**
 * API authentication configuration
 * Set these values based on your authentication method
 */
export const API_CONFIG = {
  // Option 1: Bearer Token (JWT)
  bearerToken: "", // Set to your JWT token

  // Option 2: API Key
  apiKey: "", // Set to your API key

  // Request timeout in milliseconds
  timeout: 1000 * 30,
};

/**
 * Helper function to get authentication headers
 * Note: Session ID is automatically added via buildRequestHeaders
 */
export const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {};

  if (API_CONFIG.bearerToken) {
    headers["Authorization"] = `Bearer ${API_CONFIG.bearerToken}`;
  } else if (API_CONFIG.apiKey) {
    headers["X-API-Key"] = API_CONFIG.apiKey;
  }

  return headers;
};

/**
 * Console logging styles for service calls
 */
const LOG_STYLES = {
  service: "color: #3b82f6; font-weight: bold",
  mock: "color: #8b5cf6; font-weight: bold",
  api: "color: #10b981; font-weight: bold",
  success: "color: #10b981",
  error: "color: #ef4444",
  info: "color: #64748b",
};

/**
 * Logger utility for service calls
 */
export const logger = {
  /**
   * Log a service request
   */
  request: (serviceName: string, operation: string, params?: any) => {
    const timestamp = new Date().toISOString();
    const mode = USE_MOCK_DATA ? "MOCK" : "API";
    const modeStyle = USE_MOCK_DATA ? LOG_STYLES.mock : LOG_STYLES.api;

    console.groupCollapsed(
      `%c[${mode}] %c${serviceName} %c→ ${operation}`,
      modeStyle,
      LOG_STYLES.service,
      LOG_STYLES.info,
    );
    console.log(`%cTimestamp: %c${timestamp}`, LOG_STYLES.info, "");
    console.log(`%cMode: %c${mode}`, LOG_STYLES.info, modeStyle);

    if (params && Object.keys(params).length > 0) {
      console.log(`%cParameters:`, LOG_STYLES.info);
      console.log(params);
    }

    console.groupEnd();
  },

  /**
   * Log a successful service response
   */
  response: (
    serviceName: string,
    operation: string,
    data: any,
    duration?: number,
  ) => {
    const mode = USE_MOCK_DATA ? "MOCK" : "API";
    const modeStyle = USE_MOCK_DATA ? LOG_STYLES.mock : LOG_STYLES.api;

    console.groupCollapsed(
      `%c[${mode}] %c${serviceName} %c✓ ${operation}`,
      modeStyle,
      LOG_STYLES.service,
      LOG_STYLES.success,
    );

    if (duration !== undefined) {
      console.log(`%cDuration: %c${duration}ms`, LOG_STYLES.info, "");
    }

    console.log(`%cResponse:`, LOG_STYLES.info);
    console.log(data);
    console.groupEnd();
  },

  /**
   * Log a service error
   */
  error: (
    serviceName: string,
    operation: string,
    error: any,
    duration?: number,
  ) => {
    const mode = USE_MOCK_DATA ? "MOCK" : "API";
    const modeStyle = USE_MOCK_DATA ? LOG_STYLES.mock : LOG_STYLES.api;

    console.groupCollapsed(
      `%c[${mode}] %c${serviceName} %c✗ ${operation}`,
      modeStyle,
      LOG_STYLES.service,
      LOG_STYLES.error,
    );

    if (duration !== undefined) {
      console.log(`%cDuration: %c${duration}ms`, LOG_STYLES.info, "");
    }

    console.log(`%cError:`, LOG_STYLES.error);
    console.error(error);
    console.groupEnd();
  },
};

// apiCall has been moved to serviceUtils.ts
// Re-export for backward compatibility
export { apiCall } from './serviceUtils';
