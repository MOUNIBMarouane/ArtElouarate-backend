# 🎨 ELOUARATE ART - Complete API Documentation

**Version:** 2.0.0  
**Base URL:** `http://localhost:3000` (Development) | `https://your-app.railway.app` (Production)  
**Database:** PostgreSQL  
**Authentication:** JWT Bearer Token

---

## 📋 Quick Reference

### System Endpoints

| Method | Endpoint               | Description       | Auth Required |
| ------ | ---------------------- | ----------------- | ------------- |
| GET    | `/api`                 | API overview      | No            |
| GET    | `/api/health`          | Health check      | No            |
| GET    | `/api/health/detailed` | Detailed health   | No            |
| GET    | `/api/test-db`         | Database test     | No            |
| GET    | `/api/system`          | System overview   | No            |
| GET    | `/api/performance`     | Performance stats | No            |
| GET    | `/api/errors?limit=50` | Error logs        | No            |

### Authentication Endpoints

| Method | Endpoint             | Description          | Auth Required |
| ------ | -------------------- | -------------------- | ------------- |
| POST   | `/api/auth/register` | User registration    | No            |
| POST   | `/api/auth/login`    | User login           | No            |
| GET    | `/api/auth/me`       | Current user profile | Yes           |

### Artworks Endpoints

| Method | Endpoint            | Description        | Auth Required |
| ------ | ------------------- | ------------------ | ------------- |
| GET    | `/api/artworks`     | Get all artworks   | No            |
| GET    | `/api/artworks/:id` | Get single artwork | No            |

### Categories Endpoints

| Method | Endpoint          | Description        | Auth Required |
| ------ | ----------------- | ------------------ | ------------- |
| GET    | `/api/categories` | Get all categories | No            |

### Admin Endpoints

| Method | Endpoint                   | Description        | Auth Required |
| ------ | -------------------------- | ------------------ | ------------- |
| GET    | `/api/admin/exists`        | Check admin exists | No            |
| POST   | `/api/admin/login`         | Admin login        | No            |
| POST   | `/api/admin/register`      | Admin registration | Admin Token   |
| POST   | `/api/admin/refresh-token` | Refresh token      | Refresh Token |

---

## 📖 Detailed API Documentation

### 🔧 System APIs

#### Health Check

```http
GET /api/health
```

**Response Example:**

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

#### API Overview

```http
GET /api
```

**Response Example:**

```json
{
  "name": "🎨 ELOUARATE ART API",
  "version": "2.0.0",
  "description": "Professional art gallery API with direct PostgreSQL",
  "endpoints": {
    "system": {
      "GET /api/health": "Server health check",
      "GET /api/test-db": "Database connection test"
    },
    "auth": {
      "POST /api/auth/register": "User registration",
      "POST /api/auth/login": "User login",
      "GET /api/auth/me": "Get current user (requires auth)"
    },
    "categories": {
      "GET /api/categories": "Get all categories"
    },
    "artworks": {
      "GET /api/artworks": "Get all artworks (with filters)",
      "GET /api/artworks/:id": "Get single artwork"
    }
  },
  "database": "PostgreSQL (direct connection)",
  "deployment": "Railway ready"
}
```

---

### 🔐 Authentication APIs

#### User Registration

```http
POST /api/auth/register
```

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

**Error Response (400):**

```json
{
  "success": false,
  "message": "Operation failed",
  "error": "User already exists with this email",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### User Login

```http
POST /api/auth/login
```

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

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

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

### 🎨 Artworks APIs

#### Get All Artworks

```http
GET /api/artworks
```

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

#### Get Single Artwork

```http
GET /api/artworks/:id
```

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

### 📂 Categories APIs

#### Get All Categories

```http
GET /api/categories
```

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

### 👨‍💼 Admin APIs

#### Check Admin Exists

```http
GET /api/admin/exists
```

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

#### Admin Login

```http
POST /api/admin/login
```

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

---

## 🔧 Technical Details

### Response Format

All API endpoints return responses in this consistent format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": { ... } | null,
  "error": "Error details" | undefined,
  "timestamp": "ISO 8601 timestamp"
}
```

### Authentication

Use JWT Bearer tokens in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created)
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Authentication failed)
- `404` - Not Found (Resource not found)
- `429` - Too Many Requests (Rate limited)
- `500` - Internal Server Error

### Rate Limiting

- **General APIs:** 100 requests per 15 minutes per IP
- **Auth APIs:** 5 requests per 15 minutes per IP
- **Admin APIs:** 5 requests per 15 minutes per IP

---

## 🚀 Example Usage

### Complete User Flow

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

# 3. Get user profile (use token from login response)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Browse Artworks

```bash
# Get all artworks
curl -X GET http://localhost:3000/api/artworks

# Get artworks with filters
curl -X GET "http://localhost:3000/api/artworks?page=1&limit=10&search=painting&minPrice=100&maxPrice=500"

# Get specific artwork
curl -X GET http://localhost:3000/api/artworks/artwork_123

# Get all categories
curl -X GET http://localhost:3000/api/categories
```

### System Health

```bash
# Basic health check
curl -X GET http://localhost:3000/api/health

# Detailed system status
curl -X GET http://localhost:3000/api/system

# Performance metrics
curl -X GET http://localhost:3000/api/performance
```

---

## 📚 Frontend Integration

### JavaScript/React Example

```javascript
// API client setup
const API_BASE = "http://localhost:3000";

// Login function
async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("token", data.data.token);
    return data.data.user;
  }

  throw new Error(data.error || "Login failed");
}

// Get artworks function
async function getArtworks(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/artworks?${params}`);
  const data = await response.json();

  if (data.success) {
    return data.data;
  }

  throw new Error(data.error || "Failed to fetch artworks");
}

// Authenticated request
async function getCurrentUser() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (data.success) {
    return data.data;
  }

  throw new Error(data.error || "Failed to get user");
}
```

---

**Last Updated:** 2024-01-01  
**Maintainer:** ELOUARATE ART Team

> 🎨 All APIs are production-ready with proper error handling, validation, and security measures!
