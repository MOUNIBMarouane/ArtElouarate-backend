# 🎨 ELOUARATE ART - Backend API

## Clean Production Backend for Railway Deployment

### ✅ What's Included:

- **server.js** - Main Express server with PostgreSQL connection
- **Routes** - Admin and sitemap routes
- **Middleware** - Security, authentication, and performance
- **Services** - Email and authentication services
- **No Prisma** - Direct PostgreSQL connection for simplicity

### 🚀 Railway Deployment:

```bash
railway up
```

### 🔧 Environment Variables Required:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-secure-secret
ADMIN_EMAIL=admin@elouarate.com
ADMIN_PASSWORD=Admin123!
```

### 📊 Key Features:

- ✅ Direct PostgreSQL connection (no ORM)
- ✅ JWT Authentication
- ✅ File uploads support
- ✅ CORS configured for Railway
- ✅ Security middleware
- ✅ Health check endpoint

### 🔗 Main Endpoints:

- `GET /api/health` - Health check
- `POST /api/auth/admin/login` - Admin authentication
- `GET /api/artworks` - List artworks
- `GET /api/categories` - List categories
- `GET /sitemap.xml` - SEO sitemap

Ready for production deployment! 🚀

# 🚀 Add Backend to Existing Railway Project

## You already have "prolific-charm" project with:

- ✅ PostgreSQL database
- ✅ Frontend service (ArtElouarrate-frontend)
- 🔄 Now adding: Backend service

## Step 1: Link to Existing Project

```bash
# You're already doing this - link to prolific-charm
railway link
# Select: prolific-charm
```

## Step 2: Deploy Backend Service

```bash
# Deploy the backend to your existing project
railway up
```

This will add a new service to your "prolific-charm" project alongside your existing services.

## Step 3: Set Environment Variables

In Railway Dashboard → prolific-charm → Backend Service → Variables:

### Essential Variables:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=elouarate-art-super-secure-jwt-secret-key-256-bits-long-2024
SESSION_SECRET=elouarate-session-secret-key-32-chars
ADMIN_EMAIL=admin@elouarate.com
ADMIN_PASSWORD=Admin123@!#
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

### Database Connection:

```
# Link to your existing PostgreSQL service
DATABASE_URL=${{Postgres.DATABASE_URL}}
POSTGRES_URL=${{Postgres.POSTGRES_URL}}
```

### Frontend Connection:

```
# Link to your existing frontend service
FRONTEND_URL=${{ArtElouarrate-frontend.RAILWAY_PUBLIC_DOMAIN}}
```

## Step 4: Update Frontend Environment

In your frontend service variables, update:

```
VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

## Step 5: Project Architecture

Your "prolific-charm" project will have:

```
prolific-charm/
├── 🗄️  Postgres (Database)
├── 🎨 ArtElouarrate-frontend (Frontend)
└── 🔧 Backend (API) ← NEW
```

All services will be:

- ✅ In the same project
- ✅ Connected automatically via Railway's service references
- ✅ Sharing the same database
- ✅ No CORS issues (same Railway domain family)

## Step 6: Test Deployment

```bash
# After deployment, get your backend URL from Railway dashboard
# Test with:
node test-deployment.js https://backend-service-name.railway.app
```

## Expected URLs:

- **Frontend**: `https://artelouarrate-frontend-production-xxxx.up.railway.app`
- **Backend**: `https://backend-production-xxxx.up.railway.app`
- **Database**: Internal Railway connection

## Benefits of Same Project:

1. ✅ **Shared Database**: All services use the same PostgreSQL instance
2. ✅ **Service Linking**: Automatic environment variable linking
3. ✅ **Cost Efficient**: One project, shared resources
4. ✅ **Easy Management**: Everything in one dashboard
5. ✅ **No CORS Issues**: Services trust each other
6. ✅ **Unified Monitoring**: All logs and metrics in one place

## Next Steps After Backend Deploys:

1. ✅ Backend will appear in your Railway dashboard
2. ✅ Get the backend public URL
3. ✅ Update frontend `VITE_API_URL` variable
4. ✅ Test the complete integration
5. ✅ All services will work together seamlessly!
