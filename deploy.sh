#!/bin/bash

# ELOUARATE ART - Railway Deployment Script
echo "🎨 ELOUARATE ART - Railway Deployment Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Pre-deployment checks:"
echo ""

# Check if frontend-nextjs exists
if [ -d "frontend-nextjs" ]; then
    echo "✅ Frontend directory found"
else
    echo "❌ Frontend directory not found"
    exit 1
fi

# Check if backend exists
if [ -d "backend" ]; then
    echo "✅ Backend directory found"
else
    echo "❌ Backend directory not found"
    exit 1
fi

echo ""
echo "🔧 Preparing for deployment..."
echo ""

# Navigate to frontend and check build
cd frontend-nextjs
echo "📦 Testing frontend build..."

if npm run build 2>/dev/null; then
    echo "✅ Frontend build successful"
else
    echo "⚠️  Frontend build failed - check your code"
    echo "   Common fixes:"
    echo "   - Run 'npm install' in frontend-nextjs/"
    echo "   - Check for TypeScript errors"
    echo "   - Verify all imports are correct"
fi

cd ..

echo ""
echo "🚀 Deployment Instructions:"
echo ""
echo "1. BACKEND DEPLOYMENT:"
echo "   • Go to https://railway.app"
echo "   • Create new project"
echo "   • Connect your GitHub repo"
echo "   • Select 'backend' folder"
echo "   • Set environment variables:"
echo "     - NODE_ENV=production"
echo "     - DATABASE_URL=your_database_url"
echo "     - JWT_SECRET=your_jwt_secret"
echo "   • Deploy!"
echo ""

echo "2. FRONTEND DEPLOYMENT:"
echo "   • In same Railway project, add new service"
echo "   • Connect your GitHub repo"
echo "   • Select 'frontend-nextjs' folder"
echo "   • Set environment variables:"
echo "     - NODE_ENV=production"
echo "     - NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api"
echo "   • Deploy!"
echo ""

echo "3. CONNECT SERVICES:"
echo "   • Update NEXT_PUBLIC_API_URL with your actual backend URL"
echo "   • Update backend CORS settings"
echo "   • Test the connection"
echo ""

echo "📚 Documentation:"
echo "   • RAILWAY_DEPLOYMENT.md - Complete deployment guide"
echo "   • DEPLOYMENT_CHECKLIST.md - Pre-deployment checklist"
echo "   • TROUBLESHOOTING.md - Common issues and solutions"
echo ""

echo "🎉 Your ELOUARATE ART gallery is ready for deployment!"
echo "   Follow the Railway deployment guide for detailed steps."
echo ""

echo "💡 Quick Tips:"
echo "   • Make sure your backend is deployed first"
echo "   • Update environment variables after deployment"
echo "   • Test your live URLs after deployment"
echo "   • Monitor Railway logs for any issues"
echo ""

echo "Happy deploying! 🚀" 