# 🎨 ELOUARATE ART - API Documentation

**Version:** 2.0.0  
**Base URL:** `http://localhost:3000` (Development) | `https://your-railway-app.railway.app` (Production)  
**Database:** PostgreSQL with direct connection  
**Authentication:** JWT Bearer Token

---

## 📋 Table of Contents

1. [System & Health APIs](#-system--health-apis)
2. [Authentication APIs](#-authentication-apis)
3. [Artworks APIs](#-artworks-apis)
4. [Categories APIs](#-categories-apis)
5. [Admin APIs](#-admin-apis)
6. [Response Format](#-response-format)
7. [Authentication](#-authentication)
8. [Error Handling](#-error-handling)
9. [Rate Limiting](#-rate-limiting)
10. [Examples](#-examples)

---

## 🔧 System & Health APIs

### Health Check

```http
GET /api/health
```

**Description:** Basic server health check with database connectivity test  
**Authentication:** None  
**Cache:** 30 seconds

**Response:**

```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "memory": {
      "rss": 45678912,
      "heapTotal": 20971520,
      "heapUsed": 18123456
    },
    "version": "v18.17.0"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### API Documentation

```http
GET /api
```

**Description:** Complete API overview and endpoint listing  
**Authentication:** None

### Database Test

```http
GET /api/test-db
```

**Description:** Test database connection and return database info  
**Authentication:** None

### Detailed Health Check

```http
GET /api/health/detailed
```

**Description:** Comprehensive health monitoring with all system checks  
**Authentication:** None

### System Overview

```http
GET /api/system
```

**Description:** Complete system status including health, errors, and performance  
**Authentication:** None

### Performance Statistics

```http
GET /api/performance
```

**Description:** Server performance metrics and statistics  
**Authentication:** None

### Error Logs

```http
GET /api/errors?limit=50
```

**Description:** Recent error logs for debugging  
**Authentication:** None  
**Query Parameters:**

- `limit` (optional): Number of errors to return (default: 50)

---

## 🔐 Authentication APIs

### User Registration

```http
POST /api/auth/register
```

**Description:** Register a new user account  
**Authentication:** None  
**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

**Validation Rules:**

- `email`: Valid email format, required
- `password`: Minimum 6 characters, required
- `firstName`: Required, string
- `lastName`: Required, string
- `phone`: Optional, valid phone format
- `dateOfBirth`: Optional, valid date format

**Success Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_1640995200000_abc123def",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### User Login

```http
POST /api/auth/login
```

**Description:** Authenticate user and return JWT token  
**Authentication:** None  
**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_1640995200000_abc123def",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Current User

```http
GET /api/auth/me
```

**Description:** Get current authenticated user profile  
**Authentication:** Required (Bearer Token)

**Success Response (200):**

```json
{
  "success": true,
  "message": "User data retrieved",
  "data": {
    "id": "user_1640995200000_abc123def",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01",
    "isEmailVerified": true,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🎨 Artworks APIs

### Get All Artworks

```http
GET /api/artworks
```

**Description:** Retrieve all artworks with pagination and filtering  
**Authentication:** None  
**Cache:** 5 minutes

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12, max: 50)
- `category` (optional): Filter by category ID
- `search` (optional): Search in name/description
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter

**Example Request:**

```http
GET /api/artworks?page=1&limit=12&category=cat123&search=painting&minPrice=100&maxPrice=1000
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Artworks retrieved successfully",
  "data": {
    "artworks": [
      {
        "id": "artwork_123",
        "name": "Sunset Painting",
        "description": "Beautiful sunset landscape painting",
        "price": 500,
        "originalPrice": 600,
        "dimensions": "30x40 cm",
        "medium": "Oil on Canvas",
        "year": 2024,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "categoryName": "Paintings",
        "categoryColor": "#FF6B6B"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 45,
      "totalPages": 4
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Single Artwork

```http
GET /api/artworks/:id
```

**Description:** Retrieve a specific artwork by ID  
**Authentication:** None

**URL Parameters:**

- `id`: Artwork ID (required)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Artwork retrieved successfully",
  "data": {
    "id": "artwork_123",
    "name": "Sunset Painting",
    "description": "Beautiful sunset landscape painting",
    "price": 500,
    "originalPrice": 600,
    "dimensions": "30x40 cm",
    "medium": "Oil on Canvas",
    "year": 2024,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "categoryName": "Paintings",
    "categoryColor": "#FF6B6B"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 📂 Categories APIs

### Get All Categories

```http
GET /api/categories
```

**Description:** Retrieve all active categories  
**Authentication:** None  
**Cache:** 10 minutes

**Success Response (200):**

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": "cat_123",
      "name": "Paintings",
      "description": "Oil and acrylic paintings",
      "color": "#FF6B6B",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "cat_456",
      "name": "Sculptures",
      "description": "3D art pieces",
      "color": "#4ECDC4",
      "isActive": true,
      "sortOrder": 2,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 👨‍💼 Admin APIs

### Check Admin Exists

```http
GET /api/admin/exists
```

**Description:** Check if any admin accounts exist in the system  
**Authentication:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Admin accounts found",
  "data": {
    "exists": true,
    "needsSetup": false,
    "setupMessage": null
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Admin Login

```http
POST /api/admin/login
```

**Description:** Authenticate admin user  
**Authentication:** None  
**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "admin_123",
      "username": "admin",
      "email": "admin@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Admin Registration

```http
POST /api/admin/register
```

**Description:** Register new admin (requires existing admin authentication)  
**Authentication:** Required (Admin Bearer Token)

**Request Body:**

```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "securepassword"
}
```

### Refresh Admin Token

```http
POST /api/admin/refresh-token
```

**Description:** Refresh admin access token using refresh token  
**Authentication:** Required (Admin Refresh Token)

---

## 📝 Response Format

All API endpoints return responses in the following consistent format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": { ... } | null,
  "error": "Error details" | undefined,
  "timestamp": "ISO 8601 timestamp"
}
```

### Success Response Structure

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response Structure

```json
{
  "success": false,
  "message": "Operation failed",
  "error": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔒 Authentication

### JWT Token Format

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload

```json
{
  "userId": "user_1640995200000_abc123def",
  "email": "user@example.com",
  "role": "USER|ADMIN",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Token Expiration

- **User Tokens:** 24 hours
- **Admin Tokens:** 24 hours
- **Refresh Tokens:** 7 days

---

## ❌ Error Handling

### HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Invalid input/validation error)
- `401` - Unauthorized (Authentication required/failed)
- `403` - Forbidden (Access denied)
- `404` - Not Found (Resource not found)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error (Server error)
- `503` - Service Unavailable (Health check failed)

### Common Error Responses

#### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Validation failed: Email is required, Password must be at least 6 characters",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Authentication Error (401)

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "Invalid or expired token",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Rate Limit Error (429)

```json
{
  "success": false,
  "message": "Too many requests",
  "error": "Rate limit exceeded. Try again in 15 minutes",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## ⚡ Rate Limiting

### General API Endpoints

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication Endpoints

- **Registration/Login:** 5 requests per 15 minutes per IP
- **Admin Login:** 5 requests per 15 minutes per IP

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995800
Retry-After: 900
```

---

## 🔍 Examples

### Complete User Registration Flow

```bash
# 1. Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Artist"
  }'

# 2. Login with credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "password": "securepassword123"
  }'

# 3. Get user profile (using token from login response)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Browse Artworks

```bash
# Get all artworks
curl -X GET http://localhost:3000/api/artworks

# Get artworks with filters
curl -X GET "http://localhost:3000/api/artworks?page=1&limit=10&search=painting&minPrice=100&maxPrice=500"

# Get specific artwork
curl -X GET http://localhost:3000/api/artworks/artwork_123

# Get categories
curl -X GET http://localhost:3000/api/categories
```

### System Monitoring

```bash
# Check system health
curl -X GET http://localhost:3000/api/health

# Get detailed system status
curl -X GET http://localhost:3000/api/system

# Check performance metrics
curl -X GET http://localhost:3000/api/performance
```

---

## 🚀 Performance Features

### Caching Strategy

- **Categories:** 10 minutes cache
- **Artworks:** 5 minutes cache
- **Health Check:** 30 seconds cache
- **System Stats:** 60 seconds cache

### Security Features

- **Helmet.js:** Security headers
- **CORS:** Cross-origin protection
- **Rate Limiting:** DDoS protection
- **Input Validation:** XSS/injection prevention
- **Password Hashing:** bcrypt with salt rounds 12
- **JWT Tokens:** Secure authentication

### Performance Optimizations

- **Compression:** gzip/deflate compression
- **Database Connection Pooling:** PostgreSQL connection pool
- **Request Monitoring:** Performance tracking
- **Error Logging:** Comprehensive error tracking
- **Memory Management:** Garbage collection monitoring

---

## 📚 Additional Resources

- **Frontend Integration:** See `frontend-nextjs/src/lib/api.ts` for React integration examples
- **Database Schema:** PostgreSQL direct queries (no ORM)
- **Deployment:** Railway-ready with `railway.toml` configuration
- **Environment Variables:** See `.env.example` for required configurations

---

**API Version:** 2.0.0  
**Last Updated:** 2024-01-01  
**Maintainer:** ELOUARATE ART Team

---

> 🎨 **Happy Coding!** For support or questions, please refer to the project documentation or contact the development team.
