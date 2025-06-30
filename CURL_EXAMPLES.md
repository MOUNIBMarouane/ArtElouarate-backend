# 🎨 ELOUARATE ART - cURL Testing Commands

## Quick Test Commands

### 🔧 System APIs

```bash
# API Overview
curl http://localhost:3000/api

# Health Check
curl http://localhost:3000/api/health

# Database Test
curl http://localhost:3000/api/test-db

# System Overview
curl http://localhost:3000/api/system

# Performance Stats
curl http://localhost:3000/api/performance
```

### 🔐 Authentication

```bash
# User Registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# User Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get Current User (replace TOKEN with actual JWT)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 🎨 Artworks

```bash
# Get All Artworks
curl http://localhost:3000/api/artworks

# Get Artworks with Pagination
curl "http://localhost:3000/api/artworks?page=1&limit=10"

# Get Artworks with Filters
curl "http://localhost:3000/api/artworks?search=painting&minPrice=100&maxPrice=500"

# Get Single Artwork
curl http://localhost:3000/api/artworks/artwork_123
```

### 📂 Categories

```bash
# Get All Categories
curl http://localhost:3000/api/categories
```

### 👨‍💼 Admin

```bash
# Check Admin Exists
curl http://localhost:3000/api/admin/exists

# Admin Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpassword"
  }'

# Admin Registration (requires admin token)
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@example.com",
    "password": "securepassword"
  }'
```

## Complete Test Flow

```bash
# 1. Check system health
echo "=== Health Check ==="
curl http://localhost:3000/api/health

echo -e "\n\n=== Register User ==="
# 2. Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

echo -e "\n\n=== Login User ==="
# 3. Login user (save token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

echo -e "\n\n=== Get Categories ==="
# 4. Get categories
curl http://localhost:3000/api/categories

echo -e "\n\n=== Get Artworks ==="
# 5. Get artworks
curl http://localhost:3000/api/artworks

echo -e "\n\n=== Test Complete ==="
```

## Production URLs

Replace `localhost:3000` with your Railway URL:

```bash
export API_BASE="https://your-app.railway.app"
curl $API_BASE/api/health
```
