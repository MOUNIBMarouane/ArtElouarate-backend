# 🔍 DEBUG: Categories Not Loading

## Issue: Frontend can't load categories from backend

## Step 1: Check if Backend is Deployed ✅

1. Go to Railway Dashboard → ArtElouarate-backend
2. Check if deployment status shows "SUCCESS"
3. Copy your backend URL (something like: `https://artelouarate-backend-production-xxxx.up.railway.app`)

## Step 2: Test Backend Health Check 🏥

Open this URL in a new browser tab:

```
https://your-backend-url/api/health
```

**Expected result**: JSON response like:

```json
{
  "success": true,
  "message": "Server is running properly",
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

**If this fails**: Backend isn't deployed properly - redeploy it.

## Step 3: Test Categories API Directly 📝

Open this URL in browser:

```
https://your-backend-url/api/categories
```

**Expected result**: JSON with categories list
**If CORS error**: Environment variables not set correctly

## Step 4: Check Frontend Environment Variables 🔧

Go to Railway Dashboard → ArtElouarrate-frontend → Variables

**Required variable**:

```
VITE_API_URL=https://your-exact-backend-url-here
```

**IMPORTANT**:

- NO trailing slash `/`
- NO `/api` at the end
- Must be your EXACT backend URL

## Step 5: Check Frontend API Configuration 🌐

Open browser console (F12) on your frontend and check:

1. **Network tab**: Are requests going to localhost:3000 or your backend URL?
2. **Console tab**: Any CORS errors?

## Step 6: Frontend Redeploy 🚀

After updating VITE_API_URL:

1. Railway Dashboard → ArtElouarrate-frontend → Deploy
2. Wait for deployment to complete
3. Hard refresh browser (Ctrl+F5)

## Step 7: Create Sample Categories 📋

If categories API works but returns empty, add sample data:

```sql
-- Run this in Railway PostgreSQL console
INSERT INTO categories (name, description, color, "isActive", "sortOrder") VALUES
('Paintings', 'Beautiful oil and acrylic paintings', '#FF6B6B', true, 1),
('Sculptures', 'Three-dimensional art pieces', '#4ECDC4', true, 2),
('Digital Art', 'Modern digital creations', '#45B7D1', true, 3),
('Photography', 'Captured moments in time', '#96CEB4', true, 4);
```

## Quick Fix Steps:

1. ✅ Get backend URL from Railway dashboard
2. ✅ Test: `https://backend-url/api/health`
3. ✅ Test: `https://backend-url/api/categories`
4. ✅ Update frontend VITE_API_URL variable
5. ✅ Redeploy frontend
6. ✅ Hard refresh browser
7. ✅ Check browser console for errors

## Common Issues:

❌ **Frontend still using localhost:3000**
→ VITE_API_URL not set or frontend not redeployed

❌ **CORS errors in console**  
→ Backend FRONTEND_URL not set correctly

❌ **Categories API returns empty []**
→ No categories in database - add sample data

❌ **Backend URL gives 404**
→ Backend not deployed properly

## Success Indicators:

✅ Backend health check returns JSON
✅ Categories API returns data (even if empty)
✅ Browser Network tab shows requests to Railway backend URL
✅ No CORS errors in console
✅ Categories section appears on frontend
