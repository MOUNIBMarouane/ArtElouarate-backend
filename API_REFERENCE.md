# 🎨 ELOUARATE ART - API Reference

## Base URLs

- **Development:** `http://localhost:3000`
- **Production:** `https://your-app.railway.app`

## 🔧 System Endpoints

| Method | Endpoint               | Description       |
| ------ | ---------------------- | ----------------- |
| GET    | `/api`                 | API overview      |
| GET    | `/api/health`          | Health check      |
| GET    | `/api/health/detailed` | Detailed health   |
| GET    | `/api/test-db`         | Database test     |
| GET    | `/api/system`          | System overview   |
| GET    | `/api/performance`     | Performance stats |
| GET    | `/api/errors?limit=50` | Error logs        |

## 🔐 Authentication Endpoints

### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🎨 Artworks Endpoints

### Get All Artworks

```http
GET /api/artworks?page=1&limit=12&category=cat123&search=painting&minPrice=100&maxPrice=500
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12)
- `category`: Filter by category ID
- `search`: Search in name/description
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

### Get Single Artwork

```http
GET /api/artworks/:id
```

## 📂 Categories Endpoints

```http
GET /api/categories
```

## 👨‍💼 Admin Endpoints

### Check Admin Exists

```http
GET /api/admin/exists
```

### Admin Login

```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

### Admin Registration

```http
POST /api/admin/register
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "securepassword"
}
```

### Refresh Admin Token

```http
POST /api/admin/refresh-token
Authorization: Bearer ADMIN_REFRESH_TOKEN
```

## 📝 Response Format

All endpoints return this format:

```json
{
  "success": true,
  "message": "Operation message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Authentication

Use JWT Bearer tokens:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ❌ Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

## 🚀 Example Responses

### Health Check Response

```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "healthy",
    "database": "connected",
    "uptime": 3600,
    "memory": { "heapUsed": 18123456 }
  }
}
```

### Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Artworks Response

```json
{
  "success": true,
  "message": "Artworks retrieved successfully",
  "data": {
    "artworks": [
      {
        "id": "artwork_123",
        "name": "Sunset Painting",
        "description": "Beautiful artwork",
        "price": 500,
        "dimensions": "30x40 cm",
        "medium": "Oil on Canvas",
        "categoryName": "Paintings"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 45,
      "totalPages": 4
    }
  }
}
```

## 🔧 Rate Limiting

- **General APIs:** 100 requests/15min
- **Auth APIs:** 5 requests/15min
- **Admin APIs:** 5 requests/15min

## 📖 Usage Examples

### JavaScript/React

```javascript
// Login
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

// Get artworks
const artworks = await fetch("/api/artworks?page=1&limit=12");

// Authenticated request
const user = await fetch("/api/auth/me", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get artworks
curl "http://localhost:3000/api/artworks?page=1&limit=10"

# Health check
curl http://localhost:3000/api/health
```

---

**Version:** 2.0.0 | **Database:** PostgreSQL | **Deployment:** Railway Ready
