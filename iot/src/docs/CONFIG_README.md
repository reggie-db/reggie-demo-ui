# Service Configuration Guide

## Overview

The IoT Dashboard supports two modes of operation:
1. **Mock Data Mode** - Uses dummy data for development and testing
2. **API Mode** - Connects to real backend API endpoints

## Quick Start

### Switching Between Mock and API Mode

Edit `/services/config.ts` and change the `USE_MOCK_DATA` constant:

```typescript
// For mock data (development)
export const USE_MOCK_DATA = true;

// For real API calls (production)
export const USE_MOCK_DATA = false;
```

### API Configuration

When using API mode (`USE_MOCK_DATA = false`), configure the following in `/services/config.ts`:

#### 1. Set API Base URL

```typescript
export const API_BASE_URL = 'http://localhost:3000/v1';
// or
export const API_BASE_URL = 'https://api.racetrac.com/v1';
```

#### 2. Configure Authentication

Choose one of the authentication methods:

**Option A: Bearer Token (JWT)**
```typescript
export const API_CONFIG = {
  bearerToken: 'your-jwt-token-here',
  apiKey: '',
  timeout: 10000,
};
```

**Option B: API Key**
```typescript
export const API_CONFIG = {
  bearerToken: '',
  apiKey: 'your-api-key-here',
  timeout: 10000,
};
```

## How It Works

All service files (`deviceService.ts`, `alertService.ts`, etc.) check the `USE_MOCK_DATA` flag:

```typescript
export const getDevices = async (): Promise<Device[]> => {
  if (USE_MOCK_DATA) {
    return Promise.resolve(getMockDevices());
  }
  return getDevicesFromAPI();
};
```

When `USE_MOCK_DATA` is:
- **`true`** - Returns mock data immediately (no network calls)
- **`false`** - Makes HTTP requests to the configured API endpoints

## API Endpoints

All API endpoints are documented in:
- `/openapi.yaml` - OpenAPI 3.0.3 specification
- `/docs/API_README.md` - Implementation guide

Key endpoints include:
- `GET /devices` - Retrieve all devices
- `GET /devices/{deviceId}` - Get specific device
- `GET /devices/{deviceId}/history` - Get historical data
- `GET /alerts` - Get all alerts
- `GET /license-plates/distribution` - Get state distribution
- `GET /object-detection/summary` - Get detection summary
- `POST /ai/chat` - AI assistant chat
- `GET /api/search` - Natural language search with pagination

## Error Handling

The API helper function includes:
- Automatic timeout (configurable via `API_CONFIG.timeout`)
- Error response parsing
- Network error handling
- Authentication header injection

## Development Workflow

1. **Start with Mock Data**
   - Set `USE_MOCK_DATA = true`
   - Develop UI and features without backend dependency
   - All mock data is defined in each service file

2. **Test with Real API**
   - Set `USE_MOCK_DATA = false`
   - Configure `API_BASE_URL` and authentication
   - Ensure backend implements OpenAPI specification

3. **Deploy to Production**
   - Set `USE_MOCK_DATA = false`
   - Use production API URL
   - Use secure authentication tokens

## Troubleshooting

### "Request timeout - please try again"
- Increase `API_CONFIG.timeout` value
- Check network connectivity
- Verify API server is running

### "HTTP 401: Unauthorized"
- Check authentication credentials
- Verify Bearer token or API key is valid
- Ensure authentication headers are correct

### "HTTP 404: Not Found"
- Verify `API_BASE_URL` is correct
- Check endpoint paths match OpenAPI specification
- Ensure backend server is properly configured

## Mock Data vs API Data

| Feature | Mock Data | API Data |
|---------|-----------|----------|
| Network calls | None | Required |
| Data refresh | Static | Real-time |
| Authentication | Not needed | Required |
| Development speed | Fast | Depends on backend |
| Testing | Easy | Requires setup |

## Best Practices

1. **Always use mock data during UI development** to maintain fast iteration cycles
2. **Test with API mode** before deploying to ensure proper integration
3. **Never commit real API credentials** to version control
4. **Use environment variables** for production configuration
5. **Keep mock data synchronized** with API response schemas

## Related Files

- `/services/config.ts` - Main configuration file
- `/services/deviceService.ts` - Device data service
- `/services/alertService.ts` - Alert service
- `/services/licensePlateService.ts` - License plate service
- `/services/objectDetectionService.ts` - Object detection service
- `/services/aiService.ts` - AI chat service
- `/services/searchService.ts` - Natural language search service
- `/openapi.yaml` - API specification
- `/docs/API_README.md` - Backend implementation guide
