/**
 * 🎨 ELOUARATE ART - Professional Production Backend Server
 * Railway Deployment Ready - Comprehensive API for Art Gallery Management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { body, validationResult } from 'express-validator';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎨 Starting ELOUARATE ART Backend Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🚀 Port: ${PORT}`);

// =============================================================================
// RAILWAY DEPLOYMENT MIDDLEWARE
// =============================================================================

// Security headers optimized for Railway
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());
app.use(morgan('combined'));

// Railway-optimized CORS - Very permissive for deployment
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  
  // Railway production domains
  'https://artelouarrate-frontend-production.up.railway.app',
  'https://artelouarate-backend-production.up.railway.app',
  
  // Dynamic Railway patterns - be very permissive
  /^https:\/\/.*\.up\.railway\.app$/,
  /^https:\/\/.*\.railway\.app$/,
  /^https:\/\/.*\.railway\.internal$/,
  
  // Additional production domains
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.netlify\.app$/
];

app.use(cors({
  origin: function (origin, callback) {
    // Always allow requests with no origin (for Railway health checks)
    if (!origin) return callback(null, true);
    
    // In production on Railway, be more permissive
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    // For development, check against allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
}));

// Rate limiting - less strict for Railway deployment
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased for Railway
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased for Railway
  message: { error: 'Too many authentication attempts' }
});

app.use('/api/', generalLimiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =============================================================================
// FILE UPLOAD SETUP
// =============================================================================

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `artwork-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, mimetype && extname);
  }
});

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatResponse = (success, data = null, message = '', error = null) => ({
  success,
  message,
  timestamp: new Date().toISOString(),
  ...(data && { data }),
  ...(error && { error })
});

const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =============================================================================
// MOCK DATABASE - Ready for Production
// =============================================================================

const categories = [
  {
    id: 1,
    name: 'Paintings',
    description: 'Beautiful hand-painted artworks',
    color: '#FF6B6B',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Sculptures',
    description: 'Three-dimensional art pieces',
    color: '#4ECDC4',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Digital Art',
    description: 'Modern digital creations',
    color: '#45B7D1',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Photography',
    description: 'Captured moments in time',
    color: '#96CEB4',
    isActive: true,
    sortOrder: 4,
    createdAt: new Date().toISOString()
  }
];

const artworks = [
  {
    id: 1,
    name: 'Sunset Dreams',
    description: 'A beautiful painting capturing the essence of a Mediterranean sunset',
    price: 1200.00,
    originalPrice: 1500.00,
    medium: 'Oil on Canvas',
    dimensions: '60x80cm',
    year: 2023,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: true,
    categoryId: 1,
    images: ['/uploads/placeholder-artwork-1.jpg'],
    viewCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Modern Harmony',
    description: 'Contemporary sculpture representing balance and movement',
    price: 2500.00,
    medium: 'Bronze',
    dimensions: '45x30x25cm',
    year: 2023,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: false,
    categoryId: 2,
    images: ['/uploads/placeholder-artwork-2.jpg'],
    viewCount: 0,
    createdAt: new Date().toISOString()
  }
];

const admins = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@elouarate.com',
    passwordHash: 'Admin123!',
    isActive: true,
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  }
];

// =============================================================================
// RAILWAY HEALTH CHECK - CRITICAL FOR DEPLOYMENT
// =============================================================================

app.get('/health', (req, res) => {
  console.log('🏥 Health check request received');
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'Server is running perfectly',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: PORT,
    railway: 'deployed'
  });
});

// Additional health checks
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🎨 ELOUARATE ART - Professional Backend API',
    version: '2.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      admin: '/api/admin/login',
      categories: '/api/categories',
      artworks: '/api/artworks',
      upload: '/api/upload/image'
    },
    deployed: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json(formatResponse(
    true,
    {
      api: 'operational',
      database: 'mock',
      stats: {
        categories: categories.length,
        artworks: artworks.length,
        admins: admins.length
      }
    },
    'API is fully operational'
  ));
});

// =============================================================================
// ADMIN AUTHENTICATION API
// =============================================================================

app.post('/api/admin/login', authLimiter, handleAsync(async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔐 Admin login attempt: ${email}`);
  
  if (!email || !password) {
    return res.status(400).json(formatResponse(
      false, null, 'Email and password are required', 'MISSING_CREDENTIALS'
    ));
  }

  const admin = admins.find(a => a.email === email && a.isActive);
  if (!admin || admin.passwordHash !== password) {
    return res.status(401).json(formatResponse(
      false, null, 'Invalid credentials', 'INVALID_CREDENTIALS'
    ));
  }

  const tokens = {
    accessToken: `mock-access-token-${admin.id}-${Date.now()}`,
    refreshToken: `mock-refresh-token-${admin.id}-${Date.now()}`
  };

  console.log(`✅ Admin login successful: ${email}`);
  
  res.json(formatResponse(true, {
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt
    },
    tokens
  }, 'Login successful'));
}));

app.get('/api/admin/profile', handleAsync(async (req, res) => {
  const admin = admins[0];
  res.json(formatResponse(true, { admin }, 'Profile retrieved successfully'));
}));

app.post('/api/admin/logout', handleAsync(async (req, res) => {
  res.json(formatResponse(true, null, 'Logout successful'));
}));

// =============================================================================
// CATEGORIES API
// =============================================================================

app.get('/api/categories', handleAsync(async (req, res) => {
  console.log('📂 Fetching categories');
  const activeCategories = categories.filter(cat => cat.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  res.json(formatResponse(true, {
    categories: activeCategories,
    total: activeCategories.length
  }, 'Categories retrieved successfully'));
}));

app.get('/api/categories/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const category = categories.find(cat => cat.id === parseInt(id) && cat.isActive);
  
  if (!category) {
    return res.status(404).json(formatResponse(
      false, null, 'Category not found', 'CATEGORY_NOT_FOUND'
    ));
  }
  
  res.json(formatResponse(true, { category }, 'Category retrieved successfully'));
}));

// =============================================================================
// ARTWORKS API
// =============================================================================

app.get('/api/artworks', handleAsync(async (req, res) => {
  const { category, status = 'AVAILABLE', featured, limit = 50, offset = 0, search } = req.query;
  console.log('🎨 Fetching artworks with filters:', { category, status, featured, search });
  
  let filteredArtworks = artworks.filter(artwork => artwork.isActive);
  
  if (category) {
    filteredArtworks = filteredArtworks.filter(a => a.categoryId === parseInt(category));
  }
  
  if (status && status !== 'ALL') {
    filteredArtworks = filteredArtworks.filter(a => a.status === status);
  }
  
  if (featured === 'true') {
    filteredArtworks = filteredArtworks.filter(a => a.isFeatured);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredArtworks = filteredArtworks.filter(a => 
      a.name.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower) ||
      a.medium.toLowerCase().includes(searchLower)
    );
  }
  
  const total = filteredArtworks.length;
  const paginatedArtworks = filteredArtworks
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json(formatResponse(true, {
    artworks: paginatedArtworks,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total
    }
  }, 'Artworks retrieved successfully'));
}));

app.get('/api/artworks/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const artwork = artworks.find(art => art.id === parseInt(id) && art.isActive);
  
  if (!artwork) {
    return res.status(404).json(formatResponse(
      false, null, 'Artwork not found', 'ARTWORK_NOT_FOUND'
    ));
  }
  
  artwork.viewCount = (artwork.viewCount || 0) + 1;
  res.json(formatResponse(true, { artwork }, 'Artwork retrieved successfully'));
}));

// =============================================================================
// FILE UPLOAD API
// =============================================================================

app.post('/api/upload/image', upload.single('image'), handleAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(
      false, null, 'No image file provided', 'NO_FILE'
    ));
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  console.log(`📸 Image uploaded: ${imageUrl}`);
  
  res.json(formatResponse(true, {
    url: imageUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  }, 'Image uploaded successfully'));
}));

// =============================================================================
// SEO & UTILITIES
// =============================================================================

app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://artelouarrate-frontend-production.up.railway.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\n\nSitemap: https://artelouarrate-frontend-production.up.railway.app/sitemap.xml`);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use('*', (req, res) => {
  res.status(404).json(formatResponse(
    false, null, `Endpoint not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'
  ));
});

app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  res.status(500).json(formatResponse(
    false, null, 
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    'INTERNAL_SERVER_ERROR'
  ));
});

// =============================================================================
// RAILWAY DEPLOYMENT - SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎨 ELOUARATE ART BACKEND - RAILWAY DEPLOYED');
  console.log('═'.repeat(60));
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌐 Health Check: /health`);
  console.log(`👤 Admin Login: /api/admin/login`);
  console.log(`📂 Categories: /api/categories`);
  console.log(`🎨 Artworks: /api/artworks`);
  console.log(`📸 Upload: /api/upload/image`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('═'.repeat(60));
  console.log('✅ RAILWAY DEPLOYMENT SUCCESSFUL!');
  console.log('✅ Backend ready to handle frontend requests!');
});

// Graceful shutdown for Railway
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;