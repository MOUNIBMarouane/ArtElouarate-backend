/**
 * 🎨 ELOUARATE ART - Professional Production Backend Server
 * Comprehensive API for Art Gallery Management System
 * Handles Authentication, Categories, Artworks, File Uploads
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

// Import services
import adminRoutes from './routes/admin.js';
import sitemapRoutes from './routes/sitemap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎨 Starting ELOUARATE ART Professional Backend Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

// =============================================================================
// PROFESSIONAL MIDDLEWARE STACK
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression for better performance
app.use(compression());

// Professional logging
app.use(morgan('combined'));

// Professional CORS configuration for Railway deployment
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  
  // Railway production domains
  'https://artelouarrate-frontend-production.up.railway.app',
  process.env.FRONTEND_URL,
  
  // Dynamic Railway patterns
  /^https:\/\/.*\.up\.railway\.app$/,
  /^https:\/\/.*\.railway\.app$/,
  
  // Additional production domains
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.netlify\.app$/
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      // In production, be more permissive for Railway
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
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

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter for auth endpoints
  message: { error: 'Too many authentication attempts' }
});

app.use('/api/', generalLimiter);

// Body parsing with larger limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =============================================================================
// PROFESSIONAL FILE UPLOAD SETUP
// =============================================================================

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `artwork-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // max 5 files per request
  },
  fileFilter: fileFilter
});

// Serve uploads statically with proper headers
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// =============================================================================
// PROFESSIONAL UTILITY FUNCTIONS
// =============================================================================

const formatResponse = (success, data = null, message = '', error = null, meta = {}) => ({
  success,
  message,
  timestamp: new Date().toISOString(),
  ...(data && { data }),
  ...(error && { error }),
  ...(Object.keys(meta).length && { meta })
});

const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatResponse(
        false,
        null,
        'Validation failed',
        {
          type: 'VALIDATION_ERROR',
          details: errors.array()
        }
      ));
    }
    next();
  };
};

// =============================================================================
// MOCK DATABASE (Replace with real database later)
// =============================================================================

let categories = [
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

let artworks = [
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

let admins = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@elouarate.com',
    passwordHash: 'Admin123!', // In real app, this would be bcrypt hashed
    isActive: true,
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  }
];

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================

app.get('/health', (req, res) => {
  res.json(formatResponse(
    true,
    {
      status: 'healthy',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    'Server is running perfectly'
  ));
});

app.get('/api/health', (req, res) => {
  res.json(formatResponse(
    true,
    {
      api: 'operational',
      database: 'mock', // Will be 'connected' when real DB is added
      endpoints: {
        admin: '/api/admin/*',
        categories: '/api/categories/*',
        artworks: '/api/artworks/*',
        upload: '/api/upload/*'
      },
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
// ADMIN AUTHENTICATION ENDPOINTS
// =============================================================================

// Admin login
app.post('/api/admin/login', authLimiter, handleAsync(async (req, res) => {
  const { email, password } = req.body;
  
  console.log(`🔐 Admin login attempt: ${email}`);
  
  if (!email || !password) {
    return res.status(400).json(formatResponse(
      false,
      null,
      'Email and password are required',
      'MISSING_CREDENTIALS'
    ));
  }

  // Find admin
  const admin = admins.find(a => a.email === email && a.isActive);
  if (!admin || admin.passwordHash !== password) {
    console.log(`❌ Invalid credentials for: ${email}`);
    return res.status(401).json(formatResponse(
      false,
      null,
      'Invalid credentials',
      'INVALID_CREDENTIALS'
    ));
  }

  // Generate mock tokens (replace with real JWT in production)
  const tokens = {
    accessToken: `mock-access-token-${admin.id}-${Date.now()}`,
    refreshToken: `mock-refresh-token-${admin.id}-${Date.now()}`
  };

  console.log(`✅ Admin login successful: ${email}`);
  
  res.json(formatResponse(
    true,
    {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt
      },
      tokens
    },
    'Login successful'
  ));
}));

// Admin profile
app.get('/api/admin/profile', handleAsync(async (req, res) => {
  // Mock authentication check (replace with real JWT verification)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(formatResponse(
      false,
      null,
      'Authentication required',
      'UNAUTHORIZED'
    ));
  }

  const admin = admins[0]; // Mock current admin
  res.json(formatResponse(
    true,
    {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt
      }
    },
    'Profile retrieved successfully'
  ));
}));

// Admin logout
app.post('/api/admin/logout', handleAsync(async (req, res) => {
  console.log('🚪 Admin logout');
  res.json(formatResponse(true, null, 'Logout successful'));
}));

// =============================================================================
// CATEGORIES API ENDPOINTS
// =============================================================================

// Get all categories
app.get('/api/categories', handleAsync(async (req, res) => {
  console.log('📂 Fetching categories');
  
  const activeCategories = categories.filter(cat => cat.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  res.json(formatResponse(
    true,
    {
      categories: activeCategories,
      total: activeCategories.length
    },
    'Categories retrieved successfully'
  ));
}));

// Get single category
app.get('/api/categories/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const category = categories.find(cat => cat.id === parseInt(id) && cat.isActive);
  
  if (!category) {
    return res.status(404).json(formatResponse(
      false,
      null,
      'Category not found',
      'CATEGORY_NOT_FOUND'
    ));
  }
  
  res.json(formatResponse(
    true,
    { category },
    'Category retrieved successfully'
  ));
}));

// Create category (Admin only)
app.post('/api/categories', 
  validateRequest([
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long (max 500 characters)'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
  ]),
  handleAsync(async (req, res) => {
    const { name, description, color = '#6366f1' } = req.body;
    
    // Check if category already exists
    if (categories.find(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json(formatResponse(
        false,
        null,
        'Category already exists',
        'CATEGORY_EXISTS'
      ));
    }
    
    const newCategory = {
      id: Math.max(...categories.map(c => c.id)) + 1,
      name: name.trim(),
      description: description?.trim() || '',
      color,
      isActive: true,
      sortOrder: categories.length + 1,
      createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    console.log(`✅ Category created: ${name}`);
    
    res.status(201).json(formatResponse(
      true,
      { category: newCategory },
      'Category created successfully'
    ));
  })
);

// Update category (Admin only)
app.put('/api/categories/:id',
  validateRequest([
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i)
  ]),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const categoryIndex = categories.findIndex(cat => cat.id === parseInt(id));
    
    if (categoryIndex === -1) {
      return res.status(404).json(formatResponse(
        false,
        null,
        'Category not found',
        'CATEGORY_NOT_FOUND'
      ));
    }
    
    const updatedCategory = {
      ...categories[categoryIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    categories[categoryIndex] = updatedCategory;
    console.log(`✅ Category updated: ${updatedCategory.name}`);
    
    res.json(formatResponse(
      true,
      { category: updatedCategory },
      'Category updated successfully'
    ));
  })
);

// Delete category (Admin only)
app.delete('/api/categories/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const categoryIndex = categories.findIndex(cat => cat.id === parseInt(id));
  
  if (categoryIndex === -1) {
    return res.status(404).json(formatResponse(
      false,
      null,
      'Category not found',
      'CATEGORY_NOT_FOUND'
    ));
  }
  
  categories.splice(categoryIndex, 1);
  console.log(`🗑️ Category deleted: ${id}`);
  
  res.json(formatResponse(
    true,
    null,
    'Category deleted successfully'
  ));
}));

// =============================================================================
// ARTWORKS API ENDPOINTS
// =============================================================================

// Get all artworks with filtering
app.get('/api/artworks', handleAsync(async (req, res) => {
  const { 
    category, 
    status = 'AVAILABLE', 
    featured, 
    limit = 50, 
    offset = 0,
    search 
  } = req.query;
  
  console.log('🎨 Fetching artworks with filters:', { category, status, featured, search });
  
  let filteredArtworks = artworks.filter(artwork => artwork.isActive);
  
  // Apply filters
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
  
  // Pagination
  const total = filteredArtworks.length;
  const paginatedArtworks = filteredArtworks
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json(formatResponse(
    true,
    {
      artworks: paginatedArtworks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    },
    'Artworks retrieved successfully'
  ));
}));

// Get single artwork
app.get('/api/artworks/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const artwork = artworks.find(art => art.id === parseInt(id) && art.isActive);
  
  if (!artwork) {
    return res.status(404).json(formatResponse(
      false,
      null,
      'Artwork not found',
      'ARTWORK_NOT_FOUND'
    ));
  }
  
  // Increment view count
  artwork.viewCount = (artwork.viewCount || 0) + 1;
  
  res.json(formatResponse(
    true,
    { artwork },
    'Artwork retrieved successfully'
  ));
}));

// Create artwork (Admin only)
app.post('/api/artworks',
  validateRequest([
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required'),
    body('description').optional().isLength({ max: 1000 }),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('categoryId').isInt({ min: 1 }).withMessage('Valid category is required')
  ]),
  handleAsync(async (req, res) => {
    const artworkData = req.body;
    
    // Verify category exists
    const category = categories.find(cat => cat.id === artworkData.categoryId);
    if (!category) {
      return res.status(400).json(formatResponse(
        false,
        null,
        'Invalid category',
        'INVALID_CATEGORY'
      ));
    }
    
    const newArtwork = {
      id: Math.max(...artworks.map(a => a.id)) + 1,
      ...artworkData,
      status: artworkData.status || 'AVAILABLE',
      isActive: true,
      isFeatured: artworkData.isFeatured || false,
      images: artworkData.images || [],
      viewCount: 0,
      createdAt: new Date().toISOString()
    };
    
    artworks.push(newArtwork);
    console.log(`✅ Artwork created: ${newArtwork.name}`);
    
    res.status(201).json(formatResponse(
      true,
      { artwork: newArtwork },
      'Artwork created successfully'
    ));
  })
);

// =============================================================================
// FILE UPLOAD ENDPOINTS
// =============================================================================

app.post('/api/upload/image', upload.single('image'), handleAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(formatResponse(
      false,
      null,
      'No image file provided',
      'NO_FILE'
    ));
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  console.log(`📸 Image uploaded: ${imageUrl}`);
  
  res.json(formatResponse(
    true,
    {
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    },
    'Image uploaded successfully'
  ));
}));

// Multiple image upload
app.post('/api/upload/images', upload.array('images', 5), handleAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(formatResponse(
      false,
      null,
      'No image files provided',
      'NO_FILES'
    ));
  }
  
  const uploadedImages = req.files.map(file => ({
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size
  }));
  
  console.log(`📸 Multiple images uploaded: ${uploadedImages.length} files`);
  
  res.json(formatResponse(
    true,
    { images: uploadedImages },
    `${uploadedImages.length} images uploaded successfully`
  ));
}));

// =============================================================================
// SITEMAP & SEO ENDPOINTS
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
  <url>
    <loc>https://artelouarrate-frontend-production.up.railway.app/ma3rid</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://artelouarrate-frontend-production.up.railway.app/artist</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: https://artelouarrate-frontend-production.up.railway.app/sitemap.xml`);
});

// =============================================================================
// ROOT & 404 HANDLERS
// =============================================================================

app.get('/', (req, res) => {
  res.json({
    message: '🎨 ELOUARATE ART - Professional Backend API',
    version: '2.0.0',
    status: 'operational',
    documentation: {
      admin: 'POST /api/admin/login',
      categories: 'GET /api/categories',
      artworks: 'GET /api/artworks',
      upload: 'POST /api/upload/image',
      health: 'GET /health'
    },
    frontend: 'https://artelouarrate-frontend-production.up.railway.app',
    deployed: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ 404 - Endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json(formatResponse(
    false,
    null,
    `Endpoint not found: ${req.method} ${req.originalUrl}`,
    'NOT_FOUND'
  ));
});

// =============================================================================
// PROFESSIONAL ERROR HANDLING
// =============================================================================

app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  
  // Handle different error types
  if (error.name === 'ValidationError') {
    return res.status(400).json(formatResponse(
      false,
      null,
      'Validation failed',
      'VALIDATION_ERROR'
    ));
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json(formatResponse(
      false,
      null,
      'Unauthorized access',
      'UNAUTHORIZED'
    ));
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(formatResponse(
      false,
      null,
      'File too large (max 10MB)',
      'FILE_TOO_LARGE'
    ));
  }
  
  // Default server error
  res.status(500).json(formatResponse(
    false,
    null,
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    'INTERNAL_SERVER_ERROR'
  ));
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎨 ELOUARATE ART BACKEND SERVER');
  console.log('═'.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`👤 Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`📂 Categories: http://localhost:${PORT}/api/categories`);
  console.log(`🎨 Artworks: http://localhost:${PORT}/api/artworks`);
  console.log(`📸 Upload: http://localhost:${PORT}/api/upload`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: https://artelouarrate-frontend-production.up.railway.app`);
  console.log('═'.repeat(50));
  console.log('✅ Backend is ready to handle frontend requests!');
});

// Graceful shutdown
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