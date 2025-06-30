# 🚀 Railway Quick Reference Card

## Essential Commands

### 🔐 Authentication

```bash
# Login to Railway
railway login

# Check current user
railway whoami

# Logout
railway logout
```

### 🚀 Project Management

```bash
# Create new project
railway new

# Link existing project
railway link [project-id]

# View project info
railway status

# Open project dashboard
railway dashboard
```

### 📦 Deployment

```bash
# Deploy all services (simple method - RECOMMENDED)
./scripts/deploy-simple.sh

# Deploy all services (advanced method)
./scripts/deploy.sh

# Deploy current directory
railway up

# Deploy with detached mode
railway up --detach

# Check deployment status
railway status
```

### 🗃️ Database

```bash
# Add PostgreSQL
railway add --database postgres

# Add other databases
railway add --database mysql
railway add --database redis
railway add --database mongo

# Connect to database
railway connect postgres

# Run database console
railway run psql $DATABASE_URL
```

### 🔧 Environment Variables

```bash
# List all variables
railway variables

# Set variable
railway variables set KEY=value

# Set for specific service
railway variables set KEY=value --service service-name

# Delete variable
railway variables delete KEY
```

### 📊 Monitoring

```bash
# View logs (all services)
railway logs

# View logs for specific service
railway logs --service elouarate-art-backend
railway logs --service elouarate-art-frontend

# Follow logs in real-time
railway logs --follow

# View metrics
railway metrics
```

### 🌐 Domains

```bash
# Generate custom domain
railway domain

# Add custom domain
railway domain add yourdomain.com

# List domains
railway domain list
```

## Service URLs

### Production

- **Frontend**: `https://elouarate-art-frontend.railway.app`
- **Backend API**: `https://elouarate-art-backend.railway.app/api`
- **Health Check**: `https://elouarate-art-backend.railway.app/api/health`

### Local Development

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api/health`

## Important Environment Variables

### Backend Required

```env
NODE_ENV=production
DATABASE_URL=${POSTGRES_URL}
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

### Frontend Required

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=${elouarate-art-backend.RAILWAY_PUBLIC_DOMAIN}/api
NEXT_PUBLIC_APP_NAME=ELOUARATE ART
```

## Common Issues & Solutions

### Build Failures

```bash
# Check build logs
railway logs --deployment [deployment-id]

# Common fixes:
# 1. Verify Node.js version (18+)
# 2. Check package.json scripts
# 3. Clear cache and redeploy
railway up --detach
```

### Database Connection

```bash
# Test connection
railway run npm run health

# Check DATABASE_URL
railway variables | grep DATABASE

# Connect to database directly
railway connect postgres
```

### CORS Issues

```bash
# Update CORS origin in backend
railway variables set CORS_ORIGIN=https://your-frontend.railway.app

# Redeploy backend
railway up --service elouarate-art-backend
```

## Development Workflow

### 1. Local Development Setup

```bash
# Setup local environment
./scripts/setup-local.sh

# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend-nextjs && npm run dev
```

### 2. Deploy to Railway

```bash
# Simple deployment (RECOMMENDED)
./scripts/deploy-simple.sh

# Advanced deployment
./scripts/deploy.sh

# Deploy specific component
./scripts/deploy.sh backend
./scripts/deploy.sh frontend
./scripts/deploy.sh database
```

### 3. Testing Deployment

```bash
# Run post-deployment tests
./scripts/deploy.sh test

# Manual health checks
curl https://your-backend.railway.app/api/health
curl https://your-frontend.railway.app
```

## File Structure

```
storePint/
├── railway.toml                 # Main project configuration
├── .railwayignore              # Railway ignore file
├── DEPLOYMENT_GUIDE.md         # Comprehensive deployment guide
├── scripts/
│   ├── deploy.sh               # Automated deployment script
│   └── setup-local.sh          # Local development setup
├── backend/
│   ├── railway.toml            # Backend service config
│   ├── .env.example            # Environment template
│   └── package.json            # Backend dependencies
└── frontend-nextjs/
    ├── railway.toml            # Frontend service config
    ├── .env.example            # Environment template
    ├── next.config.ts          # Next.js configuration
    └── package.json            # Frontend dependencies
```

## Support Resources

### Railway

- 📖 [Railway Docs](https://docs.railway.app)
- 💬 [Railway Discord](https://discord.gg/railway)
- 🐛 [Railway GitHub](https://github.com/railwayapp)

### Project

- 📋 [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- 🚀 [Railway Dashboard](https://railway.app/dashboard)
- 📊 [Service Metrics](https://railway.app/dashboard)

## Quick Troubleshooting

| Issue                  | Command                    | Solution             |
| ---------------------- | -------------------------- | -------------------- |
| Service not responding | `railway ps`               | Check service status |
| Build failing          | `railway logs`             | Check build logs     |
| Database connection    | `railway connect postgres` | Test DB connection   |
| Environment variables  | `railway variables`        | Verify all vars set  |
| CORS errors            | Update CORS_ORIGIN         | Redeploy backend     |
| Deployment stuck       | `railway up --detach`      | Force redeploy       |

---

💡 **Pro Tip**: Always test locally before deploying to Railway!

🎨 **ELOUARATE ART** - Railway Deployment Made Easy!
