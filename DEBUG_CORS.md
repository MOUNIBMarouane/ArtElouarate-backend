# 🔍 CORS Debug Guide

## Current Issue Analysis:

- Frontend calling: `https://artelouarate-production.up.railway.app/api/categories`
- Environment variable set to: `https://artelouarate-backend-production.up.railway.app/`
- Problem: URL mismatch + frontend not redeployed

## Step 1: Get Correct Backend URL

From Railway Dashboard → ArtElouarate-backend service → copy the exact domain

It should be one of these formats:

- `https://artelouarate-backend-production-xxxx.up.railway.app`
- `https://backend-production-xxxx.up.railway.app`
- Or similar

## Step 2: Fix Frontend Environment Variable

Go to Railway Dashboard → ArtElouarate-frontend → Variables:

**IMPORTANT**: Remove trailing slash and don't include /api

Correct format:

```
VITE_API_URL=https://your-exact-backend-domain.up.railway.app
```

NOT:

```
VITE_API_URL=https://your-exact-backend-domain.up.railway.app/
VITE_API_URL=https://your-exact-backend-domain.up.railway.app/api
```

## Step 3: Fix Backend Environment Variable

Go to Railway Dashboard → ArtElouarate-backend → Variables:

```
FRONTEND_URL=https://artelouarrate-frontend-production.up.railway.app
```

## Step 4: CRITICAL - Redeploy Both Services

1. Railway Dashboard → ArtElouarate-frontend → Deploy (redeploy)
2. Railway Dashboard → ArtElouarate-backend → Deploy (redeploy)

## Step 5: Test Backend Directly

After backend redeploys, test this URL in browser:

```
https://your-backend-domain.up.railway.app/api/health
```

Should return JSON, not CORS error.

## Step 6: Clear Browser Cache

- Hard refresh: Ctrl+F5
- Or open incognito window
- Check Network tab - should see requests to new backend URL

## Common Mistakes:

❌ Adding trailing slash to VITE_API_URL
❌ Including /api in VITE_API_URL  
❌ Not redeploying after env changes
❌ Wrong backend domain name
❌ Browser cache showing old requests
