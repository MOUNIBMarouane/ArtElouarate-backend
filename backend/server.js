/**
 * 🎨 ELOUARATE ART - Production Server for Railway
 * Direct PostgreSQL implementation (no Prisma)
 * All existing features preserved
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import security from './middleware/security.js';
import performance from './middleware/performance.js';
import monitoring from './lib/monitoring.js';
// Optional route imports
// import adminRoutes from './routes/admin.js';
import sitemapRoutes from './routes/sitemap.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// DATABASE CONNECTION (PostgreSQL Direct)
// =============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// Security & Performance
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for frontend
  crossOriginEmbedderPolicy: false
}));
app.use(compression(performance.compressionConfig));
app.use(morgan('combined'));

// CORS configuration - Dynamic for Railway deployment
const corsOrigins = [
  // Local development
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  // Production domains
  process.env.FRONTEND_URL,
  // Railway domains (dynamic)
  ...(process.env.NODE_ENV === 'production' ? [
    /^https:\/\/.*\.railway\.app$/,
    /^https:\/\/.*\.up\.railway\.app$/
  ] : []),
  // Additional domains
  'https://*.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    const isAllowed = corsOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin || allowedOrigin.includes('*');
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Advanced Security Middleware
app.use(security.securityHeaders);
app.use(security.securityLogger);
app.use(security.requestSizeLimiter);
app.use('/api/', security.apiRateLimit);
app.use(performance.performanceMonitor);



// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts' },
  skipSuccessfulRequests: true,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${extension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// =============================================================================
// ROUTES SETUP
// =============================================================================

// Simple admin login endpoint (fallback)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(createResponse(false, null, '', 'Email and password required'));
    }

    // Get admin from database
    const adminResult = await query(
      'SELECT id, email, password, username, "isActive" FROM admins WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json(createResponse(false, null, '', 'Invalid credentials'));
    }

    const admin = adminResult.rows[0];
    
    if (!admin.isActive) {
      return res.status(401).json(createResponse(false, null, '', 'Account is disabled'));
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json(createResponse(false, null, '', 'Invalid credentials'));
    }

    // Generate token
    const token = generateToken({ 
      userId: admin.id, 
      email: admin.email, 
      role: 'admin' 
    });

    // Return success response with proper structure for frontend
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: token,
        refreshToken: token, // For now, use same token
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json(createResponse(false, null, '', 'Login failed'));
  }
});

// Admin forgot password endpoint
app.post('/api/admin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json(createResponse(false, null, '', 'Email is required'));
    }

    // Check if admin exists
    const adminResult = await query(
      'SELECT id, email, username FROM admins WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json(createResponse(true, null, 'If an account with that email exists, a reset link has been sent.'));
    }

    const admin = adminResult.rows[0];
    
    // Generate reset token (simple implementation - in production use crypto.randomBytes)
    const resetToken = jwt.sign(
      { userId: admin.id, email: admin.email, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await query(
      'UPDATE admins SET "passwordResetToken" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [resetToken, admin.id]
    );

    // In a real app, you would send an email here
    // For now, we'll just log the reset link
    console.log(`🔗 Password reset link for ${email}:`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   Use this in the reset password form`);

    res.json(createResponse(true, null, 'If an account with that email exists, a reset link has been sent.'));

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to process password reset request'));
  }
});

// Admin reset password endpoint
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json(createResponse(false, null, '', 'Token and new password are required'));
    }

    if (newPassword.length < 8) {
      return res.status(400).json(createResponse(false, null, '', 'Password must be at least 8 characters long'));
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json(createResponse(false, null, '', 'Invalid or expired reset token'));
    }

    // Find admin with this reset token
    const adminResult = await query(
      'SELECT id, email FROM admins WHERE id = $1 AND "passwordResetToken" = $2',
      [decoded.userId, token]
    );

    if (adminResult.rows.length === 0) {
      return res.status(400).json(createResponse(false, null, '', 'Invalid or expired reset token'));
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    // Update password and clear reset token
    await query(
      'UPDATE admins SET password = $1, "passwordResetToken" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    res.json(createResponse(true, null, 'Password has been reset successfully. You can now login with your new password.'));

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to reset password'));
  }
});

// Mount admin routes (main login endpoint is above)
// app.use('/api/admin', adminRoutes);

// Mount sitemap routes  
app.use('/', sitemapRoutes);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Database query helper with error handling
const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Response formatter
const createResponse = (success, data = null, message = '', error = '') => ({
  success,
  message: message || (success ? 'Operation successful' : 'Operation failed'),
  data,
  error: error || undefined,
  timestamp: new Date().toISOString()
});

// JWT helper functions
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(createResponse(false, null, '', 'Authentication required'));
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Get user from database
    const userResult = await query(
      'SELECT id, email, "firstName", "lastName", "isActive", role FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0 || !userResult.rows[0].isActive) {
      return res.status(401).json(createResponse(false, null, '', 'User not found or inactive'));
    }

    req.user = userResult.rows[0];
    req.userId = userResult.rows[0].id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json(createResponse(false, null, '', 'Invalid or expired token'));
  }
};

// Admin user initialization - Updated to match existing table structure
const createInitialAdmin = async () => {
  try {
    // Check if admin table exists, if not create it with correct structure
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY DEFAULT ('adm_' || substr(md5(random()::text), 1, 12)),
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "isSuperAdmin" BOOLEAN DEFAULT false,
        permissions TEXT DEFAULT 'admin',
        "lastLogin" TIMESTAMP,
        "loginAttempts" INTEGER DEFAULT 0,
        "lockoutUntil" TIMESTAMP,
        "passwordResetToken" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if any admin exists
    const adminCheck = await query('SELECT COUNT(*) as count FROM admins');
    const adminCount = parseInt(adminCheck.rows[0].count);

    if (adminCount === 0) {
      // Create default admin user
      const defaultEmail = process.env.ADMIN_EMAIL || 'admin@elouarate.com';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      const hashedPassword = await bcryptjs.hash(defaultPassword, 12);
      const adminId = 'adm_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      await query(`
        INSERT INTO admins (id, username, email, password, "isActive", "isSuperAdmin", permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [adminId, 'admin', defaultEmail, hashedPassword, true, true, 'admin']);

      console.log('✅ Default admin user created');
      console.log(`📧 Email: ${defaultEmail}`);
      console.log(`🔒 Password: ${defaultPassword}`);
      console.log(`👤 Username: admin`);
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    // Don't throw error - let the server continue
  }
};

// =============================================================================
// SYSTEM ENDPOINTS
// =============================================================================

// Health check
app.get('/api/health', performance.healthCache, async (req, res) => {
    try {
    // Test database connection
    await query('SELECT 1');
    
    res.json(createResponse(true, {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }, 'Server is healthy'));
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json(createResponse(false, null, '', 'Database connection failed'));
  }
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    res.json(createResponse(true, result.rows[0], 'Database connection successful'));
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json(createResponse(false, null, '', 'Database test failed'));
  }
});

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

// User registration
app.post('/api/auth/register', [
  security.registrationRateLimit,
  security.validateRegistration
], async (req, res) => {
  try {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', 'Validation failed: ' + errors.array().map(e => e.msg).join(', ')));
    }

    const { email, password, firstName, lastName, phone, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json(createResponse(false, null, '', 'User already exists with this email'));
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Generate unique ID (simple UUID alternative)
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Insert user
    const result = await query(`
      INSERT INTO users (id, email, password, "firstName", "lastName", phone, "dateOfBirth", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, "firstName", "lastName", "createdAt"
    `, [userId, email, hashedPassword, firstName, lastName, phone || null, dateOfBirth || null]);

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: 'USER'
    });

    res.status(201).json(createResponse(true, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      },
      token
    }, 'User registered successfully'));

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createResponse(false, null, '', 'Registration failed'));
  }
});

// User login
app.post('/api/auth/login', [
  security.authRateLimit,
  security.validateLogin
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', 'Invalid email or password format'));
    }

    const { email, password } = req.body;

    // Get user from database
    const result = await query(
      'SELECT id, email, password, "firstName", "lastName", "isActive", role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(createResponse(false, null, '', 'Invalid email or password'));
    }

    const user = result.rows[0];

    if (!user.isActive) {
      return res.status(401).json(createResponse(false, null, '', 'Account is deactivated'));
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json(createResponse(false, null, '', 'Invalid email or password'));
    }

    // Update last login
    await query(
      'UPDATE users SET "lastLogin" = NOW(), "updatedAt" = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'USER'
    });

    res.json(createResponse(true, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    }, 'Login successful'));

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createResponse(false, null, '', 'Login failed'));
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await query(
      'SELECT id, email, "firstName", "lastName", phone, "dateOfBirth", "isEmailVerified", "lastLogin", "createdAt" FROM users WHERE id = $1',
      [req.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'User not found'));
    }

    res.json(createResponse(true, user.rows[0], 'User data retrieved'));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to get user data'));
  }
});

// =============================================================================
// CATEGORIES ENDPOINTS
// =============================================================================

// Cache management
const cache = {
  categories: {
    data: null,
    lastFetched: null,
    ttl: 5 * 60 * 1000, // 5 minutes cache TTL
  },
  artworks: {
    data: null,
    lastFetched: null,
    ttl: 2 * 60 * 1000, // 2 minutes cache TTL
  }
};

// Helper to check if cache is valid
const isCacheValid = (cacheKey) => {
  return cache[cacheKey].data !== null && 
         cache[cacheKey].lastFetched !== null && 
         (Date.now() - cache[cacheKey].lastFetched) < cache[cacheKey].ttl;
};

// Helper to invalidate specific cache
const invalidateCache = (cacheKey) => {
  if (cache[cacheKey]) {
    cache[cacheKey].data = null;
    cache[cacheKey].lastFetched = null;
    console.log(`🧹 Cache invalidated: ${cacheKey}`);
  }
};

// Get all categories (with performance optimization)
app.get('/api/categories', async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid('categories')) {
      console.log('🚀 Serving categories from cache');
      return res.json(createResponse(true, cache.categories.data, 'Categories retrieved from cache'));
    }
    
    // If not cached, fetch from database
    console.log('🔍 Fetching categories from database');
    const categoriesResult = await query(`
      SELECT 
        c.id, c.name, c.description, c.color, 
        c."isActive", c."sortOrder", 
        c."createdAt", c."updatedAt",
        COUNT(a.id) AS "artworkCount"
      FROM categories c
      LEFT JOIN artworks a ON c.id = a."categoryId"
      GROUP BY c.id
      ORDER BY c."sortOrder", c.name
    `);

    const categories = categoriesResult.rows;
    
    // Update cache
    cache.categories.data = categories;
    cache.categories.lastFetched = Date.now();
    
    res.json(createResponse(true, categories, 'Categories retrieved successfully'));
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to retrieve categories'));
  }
});

// Get category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoryResult = await query(`
      SELECT 
        c.id, c.name, c.description, c.color, 
        c."isActive", c."sortOrder", 
        c."createdAt", c."updatedAt",
        COUNT(a.id) AS "artworkCount"
      FROM categories c
      LEFT JOIN artworks a ON c.id = a."categoryId"
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Category not found'));
    }

    const category = categoryResult.rows[0];
    
    // Get artworks in this category
    const artworksResult = await query(`
      SELECT * FROM artworks WHERE "categoryId" = $1 AND "isActive" = true
      ORDER BY "createdAt" DESC
    `, [id]);
    
    category.artworks = artworksResult.rows;
    
    res.json(createResponse(true, category, 'Category retrieved successfully'));
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to retrieve category'));
  }
});

// Create category with validation
app.post('/api/categories', authenticate, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  body('description').trim().isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('color').trim().isHexColor().withMessage('Color must be a valid hex color')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', errors.array()[0].msg));
    }
    
    const { name, description, color } = req.body;
    
    // Check if category with same name already exists
    const existingCategory = await query('SELECT id FROM categories WHERE name = $1', [name]);
    if (existingCategory.rows.length > 0) {
      return res.status(400).json(createResponse(false, null, '', 'Category with this name already exists'));
    }
    
    // Create category
    const result = await query(
      `INSERT INTO categories (name, description, color, "isActive", "sortOrder")
       VALUES ($1, $2, $3, true, 0)
       RETURNING id, name, description, color, "isActive", "sortOrder", "createdAt", "updatedAt"`,
      [name, description, color]
    );
    
    const newCategory = result.rows[0];
    
    // Invalidate categories cache
    invalidateCache('categories');
    
    res.status(201).json(createResponse(true, newCategory, 'Category created successfully'));
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to create category'));
  }
});

// Update category with validation
app.put('/api/categories/:id', authenticate, [
  body('name').trim().optional().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  body('description').trim().optional().isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('color').trim().optional().isHexColor().withMessage('Color must be a valid hex color')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', errors.array()[0].msg));
    }
    
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    // Check if category exists
    const existingResult = await query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Category not found'));
    }
    
    // Check if name already exists (for another category)
    if (name) {
      const duplicateResult = await query('SELECT id FROM categories WHERE name = $1 AND id <> $2', [name, id]);
      if (duplicateResult.rows.length > 0) {
        return res.status(400).json(createResponse(false, null, '', 'Another category with this name already exists'));
      }
    }
    
    // Build dynamic update query
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (color !== undefined) {
      updateFields.push(`color = $${paramCount++}`);
      values.push(color);
    }
    
    updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);
    
    // Update category
    const result = await query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, description, color, "isActive", "sortOrder", "createdAt", "updatedAt"`,
      values
    );
    
    const updatedCategory = result.rows[0];
    
    // Invalidate categories cache
    invalidateCache('categories');
    
    res.json(createResponse(true, updatedCategory, 'Category updated successfully'));
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to update category'));
  }
});

// Delete category with checks for dependent artworks
app.delete('/api/categories/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has artworks
    const artworksResult = await query('SELECT COUNT(*) FROM artworks WHERE "categoryId" = $1', [id]);
    const artworkCount = parseInt(artworksResult.rows[0].count, 10);
    
    if (artworkCount > 0) {
      return res.status(400).json(createResponse(false, null, '', `Category has ${artworkCount} artworks. Please move or delete them first.`));
    }
    
    // Delete category
    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Category not found'));
    }
    
    // Invalidate categories cache
    invalidateCache('categories');
    
    res.json(createResponse(true, { id }, 'Category deleted successfully'));
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to delete category'));
  }
});

// =============================================================================
// ARTWORKS ENDPOINTS  
// =============================================================================

// Get all artworks (paginated and optimized)
app.get('/api/artworks', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    
    // Only use cache for default no-filter requests
    if (!search && !category && page === 1 && limit === 12 && isCacheValid('artworks')) {
      console.log('🚀 Serving artworks from cache');
      return res.json(createResponse(true, cache.artworks.data, 'Artworks retrieved from cache'));
    }
    
    // Build query with filters
    let queryText = `
      SELECT 
        a.id, a.name, a.description, a.price, a."originalPrice", 
        a.medium, a.dimensions, a.year, a.status, a."isActive", a."isFeatured",
        a."viewCount", a."categoryId", a."createdAt", a."updatedAt",
        c.name as "categoryName", c.color as "categoryColor",
        (SELECT json_agg(json_build_object(
          'id', ai.id,
          'filename', ai.filename,
          'originalName', ai."originalName",
          'mimeType', ai."mimeType",
          'size', ai.size,
          'url', ai.url,
          'isPrimary', ai."isPrimary",
          'artworkId', ai."artworkId",
          'createdAt', ai."createdAt"
        ))
        FROM artwork_images ai 
        WHERE ai."artworkId" = a.id
        ) as "images"
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search filter
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` AND (a.name ILIKE $${queryParams.length} OR a.description ILIKE $${queryParams.length})`;
    }
    
    // Add category filter
    if (category) {
      queryParams.push(category);
      queryText += ` AND a."categoryId" = $${queryParams.length}`;
    }
    
    // Add order and pagination
    queryText += ` ORDER BY a."updatedAt" DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    // Count total (for pagination)
    let countText = `SELECT COUNT(*) FROM artworks a WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countParams.push(`%${search}%`);
      countText += ` AND (a.name ILIKE $${countParams.length} OR a.description ILIKE $${countParams.length})`;
    }
    
    if (category) {
      countParams.push(category);
      countText += ` AND a."categoryId" = $${countParams.length}`;
    }
    
    // Execute queries with Promise.all for performance
    const [artworksResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countText, countParams)
    ]);
    
    const artworks = artworksResult.rows;
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);
    
    // Only cache default queries
    if (!search && !category && page === 1 && limit === 12) {
      cache.artworks.data = {
        artworks,
        pagination: { page, limit, total, totalPages }
      };
      cache.artworks.lastFetched = Date.now();
    }
    
    res.json(createResponse(true, {
      artworks,
      pagination: { page, limit, total, totalPages }
    }, 'Artworks retrieved successfully'));
  } catch (error) {
    console.error('Error getting artworks:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to retrieve artworks'));
  }
});

// Get artwork by ID
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get artwork with images
    const artworkResult = await query(`
      SELECT 
        a.id, a.name, a.description, a.price, a."originalPrice", 
        a.medium, a.dimensions, a.year, a.status, a."isActive", a."isFeatured",
        a."viewCount", a."categoryId", a."createdAt", a."updatedAt",
        c.name as "categoryName", c.color as "categoryColor"
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      WHERE a.id = $1
    `, [id]);
    
    if (artworkResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found'));
    }
    
    const artwork = artworkResult.rows[0];
    
    // Get images
    const imagesResult = await query(`
      SELECT 
        id, filename, "originalName", "mimeType", size, url, "isPrimary", "artworkId", "createdAt"
      FROM artwork_images
      WHERE "artworkId" = $1
      ORDER BY "isPrimary" DESC
    `, [id]);
    
    artwork.images = imagesResult.rows;
    
    // Update view count (asynchronously)
    query(`UPDATE artworks SET "viewCount" = "viewCount" + 1 WHERE id = $1`, [id])
      .catch(err => console.error('Error updating view count:', err));
    
    res.json(createResponse(true, artwork, 'Artwork retrieved successfully'));
  } catch (error) {
    console.error('Error getting artwork:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to retrieve artwork'));
  }
});

// Create artwork with validation
app.post('/api/artworks', authenticate, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('originalPrice').optional().isNumeric().withMessage('Original price must be a number'),
  body('categoryId').isUUID().withMessage('Invalid category ID'),
  body('medium').trim().isLength({ min: 2 }).withMessage('Medium is required'),
  body('dimensions').trim().isLength({ min: 2 }).withMessage('Dimensions are required'),
  body('year').isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid year'),
  body('imageUrl').isURL().withMessage('Valid image URL is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', errors.array()[0].msg));
    }
    
    const { 
      name, description, price, originalPrice, categoryId,
      imageUrl, medium, dimensions, year, status = 'AVAILABLE'
    } = req.body;
    
    // Verify category exists
    const categoryCheck = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (categoryCheck.rows.length === 0) {
      return res.status(400).json(createResponse(false, null, '', 'Category not found'));
    }
    
    // Create artwork
    const artworkResult = await query(
      `INSERT INTO artworks (
        name, description, price, "originalPrice", "categoryId",
        medium, dimensions, year, status, "isActive", "isFeatured", "viewCount"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, 0)
      RETURNING *`,
      [name, description, price, originalPrice || price, categoryId, medium, dimensions, year, status]
    );
    
    const newArtwork = artworkResult.rows[0];
    
    // Add image if provided
    if (imageUrl) {
      const imageResult = await query(
        `INSERT INTO artwork_images (
          filename, "originalName", "mimeType", size, url, "isPrimary", "artworkId"
        ) VALUES ($1, $2, $3, $4, $5, true, $6)
        RETURNING *`,
        [
          `artwork_${newArtwork.id}_main.jpg`,
          `${name}.jpg`,
          'image/jpeg',
          0, // Size unknown
          imageUrl,
          newArtwork.id
        ]
      );
      
      newArtwork.images = [imageResult.rows[0]];
    }
    
    // Invalidate artworks cache
    invalidateCache('artworks');
    
    res.status(201).json(createResponse(true, newArtwork, 'Artwork created successfully'));
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to create artwork'));
  }
});

// Update artwork with validation
app.put('/api/artworks/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('originalPrice').optional().isNumeric().withMessage('Original price must be a number'),
  body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  body('medium').optional().trim().isLength({ min: 2 }).withMessage('Medium is required'),
  body('dimensions').optional().trim().isLength({ min: 2 }).withMessage('Dimensions are required'),
  body('year').optional().isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid year'),
  body('imageUrl').optional().isURL().withMessage('Valid image URL is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, null, '', errors.array()[0].msg));
    }
    
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if artwork exists
    const existingArtwork = await query('SELECT id FROM artworks WHERE id = $1', [id]);
    if (existingArtwork.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found'));
    }
    
    // If categoryId provided, verify it exists
    if (updateData.categoryId) {
      const categoryCheck = await query('SELECT id FROM categories WHERE id = $1', [updateData.categoryId]);
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json(createResponse(false, null, '', 'Category not found'));
      }
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    const fieldsToUpdate = [
      'name', 'description', 'price', 'originalPrice', 'categoryId',
      'medium', 'dimensions', 'year', 'status', 'isActive', 'isFeatured'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        let fieldName = field;
        if (['categoryId', 'originalPrice', 'isActive', 'isFeatured'].includes(field)) {
          fieldName = `"${field}"`;
        }
        
        updateFields.push(`${fieldName} = $${paramCount++}`);
        values.push(updateData[field]);
      }
    });
    
    // Only proceed if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json(createResponse(false, null, '', 'No valid fields to update'));
    }
    
    updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);
    
    // Update artwork
    const result = await query(
      `UPDATE artworks SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    const updatedArtwork = result.rows[0];
    
    // Update image if new one provided
    if (updateData.imageUrl) {
      // Check if artwork has images
      const imagesCheck = await query('SELECT id FROM artwork_images WHERE "artworkId" = $1 AND "isPrimary" = true', [id]);
      
      if (imagesCheck.rows.length > 0) {
        // Update existing primary image
        await query(
          `UPDATE artwork_images SET url = $1, "updatedAt" = CURRENT_TIMESTAMP 
           WHERE id = $2 RETURNING *`,
          [updateData.imageUrl, imagesCheck.rows[0].id]
        );
      } else {
        // Add new primary image
        await query(
          `INSERT INTO artwork_images (
            filename, "originalName", "mimeType", size, url, "isPrimary", "artworkId"
          ) VALUES ($1, $2, $3, $4, $5, true, $6)
          RETURNING *`,
          [
            `artwork_${id}_main.jpg`,
            `${updatedArtwork.name}.jpg`,
            'image/jpeg',
            0, // Size unknown
            updateData.imageUrl,
            id
          ]
        );
      }
    }
    
    // Get artwork with images for response
    const artworkResult = await query(`
      SELECT 
        a.*, c.name as "categoryName", c.color as "categoryColor",
        (SELECT json_agg(i.*) FROM artwork_images i WHERE i."artworkId" = a.id) as "images"
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      WHERE a.id = $1
    `, [id]);
    
    const fullUpdatedArtwork = artworkResult.rows[0];
    
    // Invalidate artworks cache
    invalidateCache('artworks');
    
    res.json(createResponse(true, fullUpdatedArtwork, 'Artwork updated successfully'));
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to update artwork'));
  }
});

// Delete artwork
app.delete('/api/artworks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if artwork exists
    const existingResult = await query('SELECT id FROM artworks WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found'));
    }
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Delete associated images first
      await query('DELETE FROM artwork_images WHERE "artworkId" = $1', [id]);
      
      // Delete artwork
      await query('DELETE FROM artworks WHERE id = $1', [id]);
      
      // Commit transaction
      await query('COMMIT');
      
      // Invalidate artworks cache
      invalidateCache('artworks');
      invalidateCache('categories'); // Categories need refresh due to artwork count changes
      
      res.json(createResponse(true, { id }, 'Artwork deleted successfully'));
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to delete artwork'));
  }
});

// =============================================================================
// FILE UPLOAD ENDPOINTS
// =============================================================================

// Upload single image endpoint
app.post('/api/upload/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createResponse(false, null, '', 'No image file provided'));
    }

    const { artworkId } = req.body;

    // File info
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      isPrimary: true
    };

    // If artworkId is provided, save to database
    if (artworkId && artworkId !== 'temp') {
      const imageResult = await query(
        `INSERT INTO artwork_images (
          filename, "originalName", "mimeType", size, url, "isPrimary", "artworkId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          fileInfo.filename,
          fileInfo.originalName,
          fileInfo.mimeType,
          fileInfo.size,
          fileInfo.url,
          fileInfo.isPrimary,
          artworkId
        ]
      );

      // Invalidate artworks cache
      invalidateCache('artworks');

      res.json(createResponse(true, {
        ...imageResult.rows[0],
        publicUrl: `${process.env.BACKEND_URL || ''}${fileInfo.url}`
      }, 'Image uploaded and saved successfully'));
    } else {
      // Return temporary file info for form preview
      res.json(createResponse(true, {
        ...fileInfo,
        publicUrl: `${process.env.BACKEND_URL || ''}${fileInfo.url}`,
        isTemporary: true
      }, 'Image uploaded successfully'));
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error deleting file:', unlinkError);
      });
    }
    
    res.status(500).json(createResponse(false, null, '', 'Failed to upload image'));
  }
});

// Delete image endpoint
app.delete('/api/upload/image/:imageId', authenticate, async (req, res) => {
  try {
    const { imageId } = req.params;

    // Get image info from database
    const imageResult = await query(
      'SELECT * FROM artwork_images WHERE id = $1',
      [imageId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Image not found'));
    }

    const image = imageResult.rows[0];

    // Delete from database
    await query('DELETE FROM artwork_images WHERE id = $1', [imageId]);

    // Delete physical file
    const filePath = path.join(uploadsDir, image.filename);
    fs.unlink(filePath, (unlinkError) => {
      if (unlinkError) console.error('Error deleting file:', unlinkError);
    });

    // Invalidate artworks cache
    invalidateCache('artworks');

    res.json(createResponse(true, { id: imageId }, 'Image deleted successfully'));
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to delete image'));
  }
});

// Update/replace image endpoint
app.put('/api/upload/image/:imageId', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!req.file) {
      return res.status(400).json(createResponse(false, null, '', 'No image file provided'));
    }

    // Get existing image info
    const existingImageResult = await query(
      'SELECT * FROM artwork_images WHERE id = $1',
      [imageId]
    );

    if (existingImageResult.rows.length === 0) {
      // Clean up uploaded file
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error deleting file:', unlinkError);
      });
      return res.status(404).json(createResponse(false, null, '', 'Image not found'));
    }

    const existingImage = existingImageResult.rows[0];

    // Update image info in database
    const updatedImageResult = await query(
      `UPDATE artwork_images SET 
        filename = $1, 
        "originalName" = $2, 
        "mimeType" = $3, 
        size = $4, 
        url = $5,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        `/uploads/${req.file.filename}`,
        imageId
      ]
    );

    // Delete old physical file
    const oldFilePath = path.join(uploadsDir, existingImage.filename);
    fs.unlink(oldFilePath, (unlinkError) => {
      if (unlinkError) console.error('Error deleting old file:', unlinkError);
    });

    // Invalidate artworks cache
    invalidateCache('artworks');

    res.json(createResponse(true, {
      ...updatedImageResult.rows[0],
      publicUrl: `${process.env.BACKEND_URL || ''}${updatedImageResult.rows[0].url}`
    }, 'Image updated successfully'));
  } catch (error) {
    console.error('Error updating image:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error deleting file:', unlinkError);
      });
    }
    
    res.status(500).json(createResponse(false, null, '', 'Failed to update image'));
  }
});

// =============================================================================
// FRONTEND SERVING (for production)
// =============================================================================

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../Frontend/dist');
app.use(express.static(frontendPath));

// API documentation page
app.get('/api', (req, res) => {
  res.json({
    name: '🎨 ELOUARATE ART API',
    version: '2.0.0',
    description: 'Professional art gallery API with direct PostgreSQL',
    endpoints: {
      system: {
        'GET /api/health': 'Server health check',
        'GET /api/test-db': 'Database connection test'
      },
      auth: {
        'POST /api/auth/register': 'User registration',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/me': 'Get current user (requires auth)'
      },
      categories: {
        'GET /api/categories': 'Get all categories'
      },
      artworks: {
        'GET /api/artworks': 'Get all artworks (with filters)',
        'GET /api/artworks/:id': 'Get single artwork'
      }
    },
    database: 'PostgreSQL (direct connection)',
    deployment: 'Railway ready'
  });
});

// Performance statistics endpoint
app.get('/api/performance', performance.performanceEndpoint);

// Performance statistics endpoint
app.get('/api/performance', performance.performanceEndpoint);

// Health monitoring endpoints
app.get('/api/health/detailed', async (req, res) => {
  try {
    const healthStatus = await monitoring.healthMonitor.runAllChecks();
    res.json({
      success: true,
      message: 'Detailed health status',
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System overview endpoint
app.get('/api/system', (req, res) => {
  const overview = monitoring.healthMonitor.getSystemOverview();
  const errorStats = monitoring.errorLogger.getErrorStats();
  res.json({
    success: true,
    message: 'System overview',
    data: {
      health: overview,
      errors: errorStats,
      performance: performance.getPerformanceStats()
    },
    timestamp: new Date().toISOString()
  });
});

// Error logs endpoint (for debugging)
app.get('/api/errors', (req, res) => {
  const { limit = 50 } = req.query;
  const errors = monitoring.errorLogger.getRecentErrors(parseInt(limit));
  res.json({
    success: true,
    message: 'Recent errors',
    data: errors,
    count: errors.length,
    timestamp: new Date().toISOString()
  });
});

// Catch-all for frontend routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json(createResponse(false, null, '', 'Frontend not built yet'));
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Error handling middleware
app.use(monitoring.errorTrackingMiddleware);

app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json(createResponse(
    false, 
    null, 
    '', 
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  ));
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startServer = async () => {
  try {
    // Test database connection on startup
    await query('SELECT 1');
    console.log('✅ Database connection verified');
    
    // Create initial admin user if it doesn't exist
    await createInitialAdmin();
    
    // Initialize monitoring system
    monitoring.initializeMonitoring(query);



    app.listen(PORT, '0.0.0.0', () => {
      console.log('🎨 ELOUARATE ART - Production Server');
      console.log('═'.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
      console.log('📊 Database: PostgreSQL (direct connection)');
      console.log('🚀 Railway: Ready for deployment');
      console.log('═'.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();