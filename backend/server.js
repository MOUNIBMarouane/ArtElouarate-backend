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
      'SELECT id, email, password, "firstName", "lastName", "isActive" FROM admins WHERE email = $1',
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

    // Return success response
    res.json(createResponse(true, {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName
      }
    }, 'Login successful'));

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json(createResponse(false, null, '', 'Login failed'));
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

// Admin user initialization
const createInitialAdmin = async () => {
  try {
    // Check if admin table exists, if not create it
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(100) NOT NULL,
        "lastName" VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        "isActive" BOOLEAN DEFAULT true,
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

      await query(`
        INSERT INTO admins (email, password, "firstName", "lastName")
        VALUES ($1, $2, $3, $4)
      `, [defaultEmail, hashedPassword, 'Admin', 'User']);

      console.log('✅ Default admin user created');
      console.log(`📧 Email: ${defaultEmail}`);
      console.log(`🔒 Password: ${defaultPassword}`);
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
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

// Get all categories
app.get('/api/categories', performance.categoriesCache, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, description, color, "isActive", "sortOrder", "createdAt"
      FROM categories 
      WHERE "isActive" = true 
      ORDER BY "sortOrder" ASC, name ASC
    `);

    res.json(createResponse(true, result.rows, 'Categories retrieved successfully'));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to get categories'));
  }
});

// =============================================================================
// ARTWORKS ENDPOINTS  
// =============================================================================

// Get all artworks
app.get('/api/artworks', performance.artworksCache, async (req, res) => {
    try {
    const { page = 1, limit = 12, category, search, minPrice, maxPrice } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a."isActive" = true';
    let params = [];
    let paramCount = 0;

    // Add filters
    if (category) {
      paramCount++;
      whereClause += ` AND a."categoryId" = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (a.name ILIKE $${paramCount} OR a.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (minPrice) {
      paramCount++;
      whereClause += ` AND a.price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      whereClause += ` AND a.price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
    }

    const query_text = `
      SELECT 
        a.id, a.name, a.description, a.price, a."originalPrice",
        a.dimensions, a.medium, a.year, a."isActive", a."createdAt",
        c.name as "categoryName", c.color as "categoryColor"
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      ${whereClause}
      ORDER BY a."createdAt" DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const result = await query(query_text, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM artworks a
      ${whereClause}
    `;
    const countResult = await query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].total);

    res.json(createResponse(true, {
      artworks: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Artworks retrieved successfully'));

  } catch (error) {
    console.error('Get artworks error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to get artworks'));
  }
});

// Get single artwork
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.id, a.name, a.description, a.price, a."originalPrice",
        a.dimensions, a.medium, a.year, a."isActive", a."createdAt",
        c.name as "categoryName", c.color as "categoryColor"
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      WHERE a.id = $1 AND a."isActive" = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found'));
    }

    res.json(createResponse(true, result.rows[0], 'Artwork retrieved successfully'));
  } catch (error) {
    console.error('Get artwork error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to get artwork'));
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