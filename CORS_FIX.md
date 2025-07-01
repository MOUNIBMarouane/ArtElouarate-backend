# 🔧 CORS Error Fix - Quick Steps

## Problem:

Frontend can't connect to backend due to CORS policy blocking requests.

## Solution:

### Step 1: Update Backend Variables

Go to Railway Dashboard → **ArtElouarrate-backend** → Variables:

Add this variable:

```
FRONTEND_URL=https://artelouarrate-frontend-production.up.railway.app
```

### Step 2: Update Frontend Variables

Go to Railway Dashboard → **ArtElouarrate-frontend** → Variables:

Add this variable:

```
VITE_API_URL=https://artelouarate-backend-production.up.railway.app/
```

### Step 3: Redeploy Both Services

1. Redeploy backend: Railway Dashboard → ArtElouarrate-backend → Deploy
2. Redeploy frontend: Railway Dashboard → ArtElouarrate-frontend → Deploy

### Step 4: Test

After deployment, refresh your frontend and check browser console - CORS errors should be gone!

## Alternative (Better): Use Service References

Instead of hardcoded URLs:

Backend:

```
FRONTEND_URL=${{ArtElouarrate-frontend.RAILWAY_PUBLIC_DOMAIN}}
```

Frontend:

```
VITE_API_URL=${{ArtElouarrate-backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

This automatically updates if domain changes.
