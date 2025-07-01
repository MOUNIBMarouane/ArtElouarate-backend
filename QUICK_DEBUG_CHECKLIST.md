# 🚨 QUICK DEBUG: Categories Not Loading

## Do These 3 Steps Right Now:

### 1. 🔍 Test Your Backend URL

Copy your backend URL from Railway dashboard and test these in browser:

```
https://your-backend-url/api/health
https://your-backend-url/api/categories
```

**Expected**: Both should return JSON (not CORS errors)

### 2. 🔧 Fix Frontend Environment Variable

Go to Railway Dashboard → ArtElouarrate-frontend → Variables

Add this (replace with YOUR backend URL):

```
VITE_API_URL=https://artelouarate-backend-production-XXXX.up.railway.app
```

**Important**: No `/` at the end, no `/api`!

### 3. 🚀 Redeploy Frontend

Railway Dashboard → ArtElouarrate-frontend → Deploy button

Wait for deployment, then hard refresh browser (Ctrl+F5)

## 🔍 Check Browser Console

Press F12, look for:

- ❌ Requests to `localhost:3000` = Environment variable not working
- ❌ CORS errors = Backend environment variable issue
- ✅ Requests to Railway backend URL = Working!

## If Still Not Working:

**Open browser console (F12) and take a screenshot of:**

1. **Console tab** (any red errors?)
2. **Network tab** (what URLs are being called?)

This will help me see exactly what's wrong!

## Expected Result:

Categories section should appear on your homepage with art categories listed.
