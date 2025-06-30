# 🎨 ELOUARATE ART - Backend API Summary

## Quick API List

### 🔧 System (7 endpoints)

- `GET /api` - API overview
- `GET /api/health` - Health check
- `GET /api/health/detailed` - Detailed health
- `GET /api/test-db` - Database test
- `GET /api/system` - System overview
- `GET /api/performance` - Performance stats
- `GET /api/errors` - Error logs

### 🔐 Authentication (3 endpoints)

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (auth required)

### 🎨 Artworks (2 endpoints)

- `GET /api/artworks` - Get all artworks (with filters)
- `GET /api/artworks/:id` - Get single artwork

### 📂 Categories (1 endpoint)

- `GET /api/categories` - Get all categories

### 👨‍💼 Admin (4 endpoints)

- `GET /api/admin/exists` - Check admin exists
- `POST /api/admin/login` - Admin login
- `POST /api/admin/register` - Admin registration (auth required)
- `POST /api/admin/refresh-token` - Refresh admin token

## Total: 17 Working APIs

### Authentication Required

- `/api/auth/me` - User token
- `/api/admin/register` - Admin token
- `/api/admin/refresh-token` - Refresh token

### Rate Limited

- Auth endpoints: 5 requests/15min
- Admin endpoints: 5 requests/15min
- General endpoints: 100 requests/15min

### Database: PostgreSQL

### Framework: Express.js with direct SQL queries

### Security: JWT tokens, bcrypt hashing, rate limiting, CORS, Helmet

All APIs are production-ready! 🚀
