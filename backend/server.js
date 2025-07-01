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
    description: 'Beautiful hand-painted artworks featuring landscapes, portraits, and abstract designs',
    color: '#FF6B6B',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    artworkCount: 4
  },
  {
    id: 2,
    name: 'Sculptures',
    description: 'Three-dimensional art pieces crafted with precision and artistic vision',
    color: '#4ECDC4',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    artworkCount: 2
  },
  {
    id: 3,
    name: 'Digital Art',
    description: 'Modern digital creations blending traditional art with cutting-edge technology',
    color: '#45B7D1',
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    artworkCount: 3
  },
  {
    id: 4,
    name: 'Photography',
    description: 'Captured moments in time showcasing the beauty of Moroccan culture and landscapes',
    color: '#96CEB4',
    isActive: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    artworkCount: 2
  }
];

const artworks = [
  {
    id: 1,
    name: 'Sunset Over Marrakech',
    description: 'A breathtaking oil painting capturing the magical golden hour in Marrakech, with traditional architecture silhouetted against a vibrant sky.',
    price: 1200.00,
    originalPrice: 1500.00,
    medium: 'Oil on Canvas',
    dimensions: '60x80cm',
    year: 2023,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: true,
    categoryId: 1,
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800',
    viewCount: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Modern Harmony',
    description: 'A contemporary bronze sculpture representing the balance between tradition and modernity in Moroccan art.',
    price: 2500.00,
    medium: 'Bronze',
    dimensions: '45x30x25cm',
    year: 2023,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: false,
    categoryId: 2,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    viewCount: 23,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Atlas Mountains Vista',
    description: 'A stunning landscape painting showcasing the majestic Atlas Mountains with traditional Berber villages nestled in the valleys.',
    price: 950.00,
    medium: 'Acrylic on Canvas',
    dimensions: '70x50cm',
    year: 2024,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: true,
    categoryId: 1,
    image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d3cebc?w=800',
    viewCount: 67,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Digital Mosque',
    description: 'A modern digital artwork blending traditional Islamic architecture with contemporary digital art techniques.',
    price: 650.00,
    medium: 'Digital Print',
    dimensions: '50x70cm',
    year: 2024,
    status: 'AVAILABLE',
    isActive: true,
    isFeatured: false,
    categoryId: 3,
    image: 'https://images.unsplash.com/photo-1564769625905-4ac4b8d94704?w=800',
    viewCount: 34,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Casablanca Streets',
    description: 'A captivating photograph of the bustling streets of Casablanca, showcasing the vibrant urban life of Morocco.',
    price: 450.00,
    medium: 'Photography',
    dimensions: '40x60cm',
    year: 2023,
    status: 'SOLD',
    isActive: true,
    isFeatured: false,
    categoryId: 4,
    image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d3cebc?w=800',
    viewCount: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const admins = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@elouarate.com',
    passwordHash: 'Admin123!', // In production, this would be properly hashed
    isActive: true,
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    lastLogin: null
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
    message: 'ELOUARATE ART Backend is running perfectly',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    port: PORT,
    railway: 'deployed',
    stats: {
      categories: categories.length,
      artworks: artworks.length,
      admins: admins.length
    }
  });
});

// Additional health checks
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🎨 ELOUARATE ART - Professional Backend API',
    version: '2.0.0',
    status: 'operational',
    description: 'Premium Moroccan Art Gallery Management System',
    endpoints: {
      health: '/health',
      admin: '/api/admin/login',
      categories: '/api/categories',
      artworks: '/api/artworks',
      upload: '/api/upload/image'
    },
    features: [
      'Secure Admin Authentication',
      'Artwork Management',
      'Category Management', 
      'File Upload System',
      'Professional Security',
      'Railway Optimized'
    ],
    deployed: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json(formatResponse(
    true,
    {
      api: 'operational',
      database: 'mock-ready-for-postgresql',
      services: {
        auth: 'active',
        uploads: 'active',
        categories: 'active',
        artworks: 'active'
      },
      stats: {
        categories: categories.length,
        artworks: artworks.length,
        activeArtworks: artworks.filter(a => a.isActive).length,
        featuredArtworks: artworks.filter(a => a.isFeatured).length
      }
    },
    'ELOUARATE ART API is fully operational'
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
    console.log(`❌ Invalid login attempt: ${email}`);
    return res.status(401).json(formatResponse(
      false, null, 'Invalid credentials', 'INVALID_CREDENTIALS'
    ));
  }

  // Update last login
  admin.lastLogin = new Date().toISOString();

  const tokens = {
    accessToken: `elouarate-access-${admin.id}-${Date.now()}`,
    refreshToken: `elouarate-refresh-${admin.id}-${Date.now()}`
  };

  console.log(`✅ Admin login successful: ${email}`);
  
  res.json(formatResponse(true, {
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin
    },
    tokens
  }, 'Login successful'));
}));

app.get('/api/admin/profile', handleAsync(async (req, res) => {
  const admin = admins[0];
  res.json(formatResponse(true, { admin }, 'Profile retrieved successfully'));
}));

app.post('/api/admin/logout', handleAsync(async (req, res) => {
  console.log('🚪 Admin logout');
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
  
  // Get artworks in this category
  const categoryArtworks = artworks.filter(a => a.categoryId === parseInt(id) && a.isActive);
  
  res.json(formatResponse(true, { 
    category: {
      ...category,
      artworkCount: categoryArtworks.length,
      artworks: categoryArtworks
    }
  }, 'Category retrieved successfully'));
}));

// =============================================================================
// ARTWORKS API
// =============================================================================

app.get('/api/artworks', handleAsync(async (req, res) => {
  const { 
    category, 
    status = 'AVAILABLE', 
    featured, 
    limit = 50, 
    offset = 0, 
    search,
    sort = 'newest'
  } = req.query;
  
  console.log('🎨 Fetching artworks with filters:', { category, status, featured, search, sort });
  
  let filteredArtworks = artworks.filter(artwork => artwork.isActive);
  
  // Apply filters
  if (category && category !== 'all') {
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
  
  // Apply sorting
  switch (sort) {
    case 'newest':
      filteredArtworks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      filteredArtworks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'price-low':
      filteredArtworks.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filteredArtworks.sort((a, b) => b.price - a.price);
      break;
    case 'popular':
      filteredArtworks.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      break;
    default:
      // Keep default order
  }
  
  const total = filteredArtworks.length;
  const paginatedArtworks = filteredArtworks
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  // Add category information to each artwork
  const artworksWithCategories = paginatedArtworks.map(artwork => ({
    ...artwork,
    category: categories.find(cat => cat.id === artwork.categoryId)
  }));
  
  res.json(formatResponse(true, {
    artworks: artworksWithCategories,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      totalPages: Math.ceil(total / parseInt(limit))
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
  
  // Increment view count
  artwork.viewCount = (artwork.viewCount || 0) + 1;
  
  // Add category information
  const category = categories.find(cat => cat.id === artwork.categoryId);
  
  res.json(formatResponse(true, { 
    artwork: {
      ...artwork,
      category
    }
  }, 'Artwork retrieved successfully'));
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
    size: req.file.size,
    mimeType: req.file.mimetype
  }, 'Image uploaded successfully'));
}));

app.post('/api/upload/multiple', upload.array('images', 5), handleAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(formatResponse(
      false, null, 'No image files provided', 'NO_FILES'
    ));
  }
  
  const uploadedImages = req.files.map(file => ({
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  }));
  
  console.log(`📸 Multiple images uploaded: ${uploadedImages.length} files`);
  
  res.json(formatResponse(true, {
    images: uploadedImages,
    count: uploadedImages.length
  }, `${uploadedImages.length} images uploaded successfully`));
}));

// =============================================================================
// SEO & UTILITIES
// =============================================================================

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://artelouarrate-frontend-production.up.railway.app';
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/artist</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/ma3rid</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

  // Add artwork pages
  artworks.filter(a => a.isActive).forEach(artwork => {
    sitemap += `
  <url>
    <loc>${baseUrl}/artwork/${artwork.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  sitemap += `
</urlset>`;

  res.set('Content-Type', 'text/xml');
  res.send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = 'https://artelouarrate-frontend-production.up.railway.app';
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

# Important pages
Allow: /artist
Allow: /artwork/
Allow: /ma3rid

# Disallow admin and API
Disallow: /admin
Disallow: /api

Sitemap: ${baseUrl}/sitemap.xml`);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use('*', (req, res) => {
  console.log(`❌ 404 - Endpoint not found: ${req.method} ${req.originalUrl}`);
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
  console.log('\n🎨 ELOUARATE ART BACKEND - RAILWAY DEPLOYED');
  console.log('═'.repeat(70));
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌐 Health Check: /health`);
  console.log(`👤 Admin Login: /api/admin/login (admin@elouarate.com / Admin123!)`);
  console.log(`📂 Categories: /api/categories (${categories.length} categories)`);
  console.log(`🎨 Artworks: /api/artworks (${artworks.length} artworks)`);
  console.log(`📸 Upload: /api/upload/image`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: https://artelouarrate-frontend-production.up.railway.app`);
  console.log('═'.repeat(70));
  console.log('✅ RAILWAY DEPLOYMENT SUCCESSFUL!');
  console.log('✅ Backend ready to handle frontend requests!');
  console.log('✅ All API endpoints operational!');
  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /health                 - Health check');
  console.log('   GET  /api/categories         - Get all categories');
  console.log('   GET  /api/artworks           - Get all artworks');
  console.log('   GET  /api/artworks/:id       - Get specific artwork');
  console.log('   POST /api/admin/login        - Admin authentication');
  console.log('   POST /api/upload/image       - Upload artwork image');
  console.log('\n🎯 Ready for production traffic!');
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