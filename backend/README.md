# 🎨 ELOUARATE ART - Full Stack Vercel + Supabase

A complete full-stack art gallery application with Vercel hosting and Supabase database.

## 🚀 **WHAT'S BUILT & RUNNING**

### ✅ **Backend Features**

- **Vercel-Optimized**: Serverless functions for auto-scaling
- **Supabase Integration**: PostgreSQL database with authentication
- **Prisma ORM**: Type-safe database operations
- **Express API**: RESTful endpoints for all operations
- **Security**: Rate limiting, CORS, helmet protection
- **Frontend Serving**: Automatically serves your React app

### ✅ **Database Schema Created**

Your Supabase database now has these tables:

- **Users** - User accounts and authentication
- **Admins** - Admin user management
- **Categories** - Art categories organization
- **Artworks** - Art pieces with metadata
- **ArtworkImages** - Image attachments for artworks
- **Customers** - Customer information
- **Orders** - Purchase orders
- **OrderItems** - Order line items
- **Payments** - Payment tracking
- **Inquiries** - Customer inquiries

## 🌐 **ACCESS YOUR APPLICATION**

### **Backend API**:

- **Local**: http://localhost:3000 (if running locally)
- **Production**: Will be your Vercel URL

### **Frontend**:

- **Local**: http://localhost:8080 (your current frontend)
- **Production**: Same domain as backend

## 📡 **API Endpoints Available**

### **System**

- `GET /api/health` - Server health check
- `GET /api/test-supabase` - Database connection test

### **Authentication**

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### **Artworks**

- `GET /api/artworks` - Get all artworks (with pagination/filters)
- `GET /api/artworks/:id` - Get single artwork

### **Categories**

- `GET /api/categories` - Get all categories

## 🚀 **DEPLOYMENT TO VERCEL**

### **Method 1: Vercel CLI (Recommended)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy from backend directory
cd backend
vercel --prod
```

### **Method 2: GitHub Integration**

1. **Push to GitHub**:

   ```bash
   git add .
   git commit -m "Add full-stack backend with Supabase"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `backend`
   - Add environment variables (see below)
   - Deploy!

### **Method 3: Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your repository
4. Configure settings:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: (leave empty)

## ⚙️ **ENVIRONMENT VARIABLES FOR VERCEL**

Add these in your Vercel project settings:

```env
# Supabase Configuration
SUPABASE_URL=https://hjbhpwkcipvbcvqcjvgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYmhwd2tjaXB2YmN2cWNqdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzQ4NjksImV4cCI6MjA2NjM1MDg2OX0.gOfvasaXofrcPzEJZ2kcbU7V2N00iELBKkooxiM3za8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYmhwd2tjaXB2YmN2cWNqdmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc3NDg2OSwiZXhwIjoyMDY2MzUwODY5fQ.luSb9-9HpyiFcvpJe7YI1oxK0uUiGeJck5RmWRGI864
SUPABASE_JWT_SECRET=ReyxhVd2vmIMg1rwt3Ya9ZSIR97hJuwcRGuXQrnVTSpxzexOTog9cgZcy+ePTfkktjeIoxbIurWOpl8i8/qtlw==

# Database Configuration
POSTGRES_URL=postgres://postgres.hjbhpwkcipvbcvqcjvgh:76P9wUo4MhPkgHKN@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_PRISMA_URL=postgres://postgres.hjbhpwkcipvbcvqcjvgh:76P9wUo4MhPkgHKN@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_URL_NON_POOLING=postgres://postgres.hjbhpwkcipvbcvqcjvgh:76P9wUo4MhPkgHKN@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require

# Environment
NODE_ENV=production
```

## 📱 **INTEGRATE WITH YOUR FRONTEND**

### **Update Frontend API Calls**

In your React components, update API calls to use your backend:

```javascript
// Example: Fetching artworks
const fetchArtworks = async () => {
  try {
    const response = await fetch("/api/artworks");
    const data = await response.json();
    console.log("Artworks:", data.artworks);
  } catch (error) {
    console.error("Error:", error);
  }
};

// Example: User registration
const registerUser = async (userData) => {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Registration error:", error);
  }
};
```

### **Build and Deploy Frontend**

```bash
# Build your frontend
cd Frontend
npm run build

# The backend will automatically serve the built frontend
```

## 🔄 **DEVELOPMENT WORKFLOW**

### **Local Development**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd Frontend
npm run dev
```

### **Production Deployment**

```bash
# Build frontend
cd Frontend && npm run build

# Deploy backend (includes frontend)
cd ../backend && vercel --prod
```

## 🗄️ **DATABASE MANAGEMENT**

### **View Data**

```bash
# Open Prisma Studio
cd backend
npx prisma studio
```

### **Update Schema**

```bash
# After modifying schema.prisma
npx prisma generate
npx prisma db push
```

### **Migrations**

```bash
# Create migration
npx prisma migrate dev --name your-migration-name
```

## 🔐 **SECURITY FEATURES**

- ✅ **Rate Limiting**: 100 requests per 15 minutes
- ✅ **CORS**: Configured for your domains
- ✅ **Helmet**: Security headers
- ✅ **Environment Variables**: Sensitive data protection
- ✅ **Input Validation**: Request validation
- ✅ **SQL Injection Protection**: Prisma ORM safety

## 🚀 **PRODUCTION FEATURES**

- ✅ **Auto Scaling**: Vercel serverless functions
- ✅ **Global CDN**: Fast worldwide delivery
- ✅ **SSL**: HTTPS by default
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **Database Connection Pooling**: Optimized for serverless
- ✅ **Static File Serving**: Frontend assets

## 📊 **MONITORING & LOGS**

- **Vercel Dashboard**: View function logs and analytics
- **Supabase Dashboard**: Database monitoring and logs
- **Prisma Studio**: Database content management

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

1. **Database Connection Error**:

   - Check environment variables in Vercel
   - Verify Supabase project is active

2. **Frontend Not Loading**:

   - Build frontend: `cd Frontend && npm run build`
   - Redeploy backend

3. **API Errors**:
   - Check Vercel function logs
   - Verify environment variables

### **Helpful Commands**

```bash
# Check database connection
npx prisma studio

# Test API locally
curl http://localhost:3000/api/health

# Deploy with logs
vercel --prod --debug
```

---

## 🎉 **YOU'RE READY TO GO!**

Your full-stack application is now:

- ✅ **Database Ready**: All tables created in Supabase
- ✅ **API Ready**: Complete backend with authentication
- ✅ **Deploy Ready**: Optimized for Vercel hosting
- ✅ **Frontend Ready**: Serves your React app
- ✅ **Production Ready**: Security, scaling, monitoring

**Next Steps:**

1. Deploy to Vercel using one of the methods above
2. Update your frontend to use the new API endpoints
3. Test your live application
4. Add content and go live! 🚀

---

**Happy Building! 🎨✨**
