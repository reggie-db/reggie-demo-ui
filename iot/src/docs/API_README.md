# RaceTrac IoT Monitoring Dashboard API

This directory contains the OpenAPI specification for the RaceTrac IoT Monitoring Dashboard backend API.

## OpenAPI Specification

The complete API specification is defined in [`openapi.yaml`](/openapi.yaml). This specification follows OpenAPI 3.0.3 standards and can be used to:

- Generate server-side code (Node.js, Python, Java, Go, etc.)
- Generate client SDKs
- Validate API requests and responses
- Generate interactive API documentation
- Test API endpoints

## API Overview

### Base URLs

- **Production**: `https://api.racetrac.com/v1`
- **Staging**: `https://staging-api.racetrac.com/v1`
- **Local Development**: `http://localhost:3000/v1`

### Authentication

The API supports two authentication methods:

1. **Bearer Token (JWT)**: Include in `Authorization` header
   ```
   Authorization: Bearer <your-jwt-token>
   ```

2. **API Key**: Include in `X-API-Key` header
   ```
   X-API-Key: <your-api-key>
   ```

## API Endpoints

### Devices
- `GET /devices` - Get all IoT temperature monitoring devices
- `GET /devices/{deviceId}` - Get specific device by ID
- `GET /devices/{deviceId}/history` - Get historical temperature/humidity data
- `GET /devices/stats` - Get aggregated device statistics

### Alerts
- `GET /alerts` - Get all active alerts (with optional filtering)
- `GET /alerts/stats` - Get alert statistics (critical, warning, info counts)

### License Plates
- `GET /license-plates/distribution` - Get state distribution of detected plates
- `GET /license-plates/recent` - Get recent plate detections
- `GET /license-plates/stats` - Get overall license plate statistics

### Object Detection
- `GET /object-detection/summary` - Get object detection summary (vehicles, people, trucks, packages)
- `GET /object-detection/hourly` - Get hourly detection activity
- `GET /object-detection/recent` - Get recent object detections

### AI Chat
- `POST /ai/chat` - Send message to AI assistant and receive insights

### Search
- `GET /api/search` - Search and explore data using natural language queries with pagination

## Generating Server Code

You can use the OpenAPI specification to generate server-side code in various languages:

### Node.js (Express)

```bash
# Using OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g nodejs-express-server \
  -o ./backend

# Using Swagger Codegen
swagger-codegen generate \
  -i openapi.yaml \
  -l nodejs-server \
  -o ./backend
```

### Python (Flask)

```bash
# Using OpenAPI Generator
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python-flask \
  -o ./backend
```

### Go (Gin)

```bash
# Using OpenAPI Generator
openapi-generator-cli generate \
  -i openapi.yaml \
  -g go-gin-server \
  -o ./backend
```

### Java (Spring Boot)

```bash
# Using OpenAPI Generator
openapi-generator-cli generate \
  -i openapi.yaml \
  -g spring \
  -o ./backend
```

## Viewing Documentation

You can view interactive API documentation using several tools:

### Swagger UI (Online)

1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy the contents of `openapi.yaml`
3. Paste into the editor to view interactive documentation

### Local Swagger UI

```bash
# Using Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd):/usr/share/nginx/html swaggerapi/swagger-ui

# Then open http://localhost:8080 in your browser
```

### Redoc

```bash
# Using npx
npx @redocly/cli preview-docs openapi.yaml

# Or install globally
npm install -g @redocly/cli
redocly preview-docs openapi.yaml
```

## Validating the Specification

```bash
# Using Redocly CLI
npx @redocly/cli lint openapi.yaml

# Using Swagger CLI
swagger-cli validate openapi.yaml
```

## Frontend Service Mapping

The frontend services in `/services/` map to these API endpoints:

| Frontend Service | API Endpoints |
|-----------------|---------------|
| `deviceService.ts` | `/devices`, `/devices/{deviceId}`, `/devices/{deviceId}/history`, `/devices/stats` |
| `alertService.ts` | `/alerts`, `/alerts/stats` |
| `licensePlateService.ts` | `/license-plates/distribution`, `/license-plates/recent`, `/license-plates/stats` |
| `objectDetectionService.ts` | `/object-detection/summary`, `/object-detection/hourly`, `/object-detection/recent` |
| `aiService.ts` | `/ai/chat` |

## Implementation Notes

### Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

Error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional details */ }
  }
}
```

### Timestamps

- Human-readable timestamps (e.g., "2 min ago") are provided in `time` fields
- ISO 8601 timestamps are provided in `timestamp` fields for programmatic use
- Example: `"2025-10-28T14:30:00Z"`

### Query Parameters

Many endpoints support optional query parameters for filtering and pagination:
- `limit` - Maximum number of results to return
- `offset` - Number of records to skip (for pagination)
- `type` - Filter by type (for alerts)
- `period` - Time period for data (today, week, month)
- `date` - Specific date for historical data
- `q` - Natural language search query (for search endpoint)

### Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Natural Language Search

The `/api/search` endpoint enables natural language queries to explore data with virtual scrolling support.

### Features

- **Natural Language Queries**: Use plain English to search data
- **Dynamic Columns**: Returns column structure based on query context
- **Virtual Scrolling**: Efficient pagination with `limit` and `offset`
- **Flexible Data**: Returns dataframe-like structure adaptable to different data types

### Example Queries

```bash
# Temperature and device data
GET /api/search?q=show me all temperature devices&limit=50&offset=0

# Sales data
GET /api/search?q=find sales data for last month&limit=100&offset=0

# Inventory search
GET /api/search?q=list inventory items with low stock&limit=50&offset=0

# Customer data
GET /api/search?q=show customers with high loyalty points&limit=50&offset=100
```

### Response Structure

```json
{
  "columns": ["device_id", "location", "temperature", "status"],
  "data": [
    {
      "device_id": "RT-ATL-001",
      "location": "Atlanta, GA",
      "temperature": 72.4,
      "status": "normal"
    }
  ],
  "total": 500,
  "offset": 0,
  "limit": 50,
  "hasMore": true
}
```

### Pagination Flow

1. Initial request: `offset=0, limit=50` returns records 0-49
2. Next page: `offset=50, limit=50` returns records 50-99
3. Continue incrementing offset until `hasMore` is `false`

## Development Workflow

1. **Review the OpenAPI specification** (`openapi.yaml`)
2. **Generate server code** using your preferred language/framework
3. **Implement the business logic** for each endpoint
4. **Connect to your database** (e.g., PostgreSQL, MongoDB)
5. **Integrate IoT data streams** from temperature sensors
6. **Implement ML models** for object detection and license plate recognition
7. **Set up authentication** (JWT or API keys)
8. **Deploy to your infrastructure** (AWS, Azure, GCP)

## Testing

The specification includes example requests and responses. You can:

1. Use tools like **Postman** to import the OpenAPI spec and test endpoints
2. Generate **mock servers** for development:
   ```bash
   # Using Prism
   npx @stoplight/prism-cli mock openapi.yaml
   ```
3. Write integration tests using the schema validation

## Support

For questions or issues with the API specification:
- **Email**: iot-support@racetrac.com
- **Documentation**: Review inline comments in `openapi.yaml`

## License

Proprietary - RaceTrac Petroleum
