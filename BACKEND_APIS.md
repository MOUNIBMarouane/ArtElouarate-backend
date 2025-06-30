# 🎨 ELOUARATE ART - Backend APIs

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://your-railway-app.railway.app`

## System APIs

```
GET /api                    - API documentation
GET /api/health             - Basic health check
GET /api/health/detailed    - Detailed health monitoring
GET /api/test-db           - Database connection test
GET /api/system            - System overview
GET /api/performance       - Performance statistics
GET /api/errors            - Error logs
```

## Authentication APIs

```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login
GET  /api/auth/me          - Get current user (requires auth)
```

## Artworks APIs

```
GET /api/artworks          - Get all artworks (with filters)
GET /api/artworks/:id      - Get single artwork
```

## Categories APIs

```
GET /api/categories        - Get all categories
```

## Admin APIs

```
GET  /api/admin/exists         - Check if admin exists
POST /api/admin/login          - Admin login
POST /api/admin/register       - Admin registration (requires admin auth)
POST /api/admin/refresh-token  - Refresh admin token
```

## Request Examples

### User Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### User Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Artworks with Filters

```bash
GET /api/artworks?page=1&limit=12&category=cat123&search=painting&minPrice=100&maxPrice=500
```

### Get User Profile

```bash
GET /api/auth/me
Authorization: Bearer your_jwt_token_here
```

## Response Format

```json
{
  "success": true,
  "message": "Operation message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Authentication

Use JWT Bearer tokens in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
