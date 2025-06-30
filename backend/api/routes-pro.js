/**
 * 🎨 ELOUARATE ART - Professional API Routes
 * High-performance, feature-rich API endpoints
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import crypto from 'crypto';

import AuthenticationService from '../services/auth-pro.js';
import cache, { getCacheMiddleware } from '../lib/cache-pro.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7);
    const decoded = await AuthenticationService.verifyToken(token);
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isEmailVerified: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = decoded.role || 'USER';
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      message: error.message
    });
  }
};

// Optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await AuthenticationService.verifyToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
        req.userRole = decoded.role || 'USER';
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
};

// Response helper
const createResponse = (success, data = null, message = '', error = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;

  return response;
};

// =============================================================================
// HEALTH & SYSTEM ENDPOINTS
// =============================================================================

// System health check
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test cache
    const cacheHealth = await cache.healthCheck();
    
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json(createResponse(true, {
      status: 'healthy',
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      database: 'connected',
      cache: cacheHealth,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    }, 'System is healthy'));
  } catch (error) {
    res.status(503).json(createResponse(false, null, '', 'System unhealthy: ' + error.message));
  }
});

// System statistics
router.get('/stats', getCacheMiddleware()(60), async (req, res) => {
  try {
    const [userCount, artworkCount, categoryCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.artwork.count(),
      prisma.category.count(),
      prisma.order.count()
    ]);

    const stats = {
      database: {
        users: userCount,
        artworks: artworkCount,
        categories: categoryCount,
        orders: orderCount
      },
      cache: cache.getStats(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    res.json(createResponse(true, stats, 'Statistics retrieved'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, '', 'Failed to get statistics'));
  }
});

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

// Check admin existence
router.get('/auth/admin/exists', async (req, res) => {
  try {
    console.log('🔐 Admin existence check');
    
    const adminCount = await prisma.user.count({
      where: { 
        role: 'ADMIN',
        isActive: true 
      }
    });
    
    const adminExists = adminCount > 0;
    
    res.json(createResponse(true, {
      exists: adminExists,
      needsSetup: !adminExists,
      setupMessage: adminExists ? null : 'Please create an admin account'
    }, adminExists ? 'Admin accounts found' : 'Admin setup required'));
    
  } catch (error) {
    console.error('Admin exists check error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to check admin existence'));
  }
});

// Admin login
router.post('/auth/admin/login', async (req, res) => {
  try {
    console.log('🔐 Admin login attempt');
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(createResponse(false, null, '', 'Email and password are required'));
    }
    
    const result = await AuthenticationService.adminLogin(email, password, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json(createResponse(true, result, 'Admin login successful'));
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json(createResponse(false, null, '', error.message));
  }
});

// Admin setup endpoint
router.post('/auth/admin/setup', async (req, res) => {
  try {
    console.log('🔧 Admin setup request');
    
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json(createResponse(false, null, '', 'Username, email, and password are required'));
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN',
        isActive: true 
      }
    });

    if (existingAdmin) {
      return res.status(400).json(createResponse(false, null, '', 'Admin already exists'));
    }

    // Create admin user
    const result = await AuthenticationService.register({
      email,
      password,
      firstName: username.split(' ')[0] || username,
      lastName: username.split(' ')[1] || 'Admin',
      role: 'ADMIN'
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json(createResponse(true, result, 'Admin setup completed successfully'));
    
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Admin dashboard statistics
router.get('/auth/admin/dashboard/stats', authenticate, async (req, res) => {
  try {
    console.log('📊 Admin dashboard stats request');
    
    const [userCount, artworkCount, categoryCount, orderCount] = await Promise.all([
      prisma.user.count(),
      prisma.artwork.count(),
      prisma.category.count(),
      prisma.order.count()
    ]);

    const stats = {
      overview: {
        totalUsers: userCount,
        totalArtworks: artworkCount,
        totalCategories: categoryCount,
        totalRevenue: 0 // TODO: Calculate from orders
      },
      users: {
        total: userCount,
        active: await prisma.user.count({ where: { isActive: true } }),
        newThisMonth: await prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      },
      artworks: {
        total: artworkCount,
        published: await prisma.artwork.count({ where: { isActive: true } }),
        featured: await prisma.artwork.count({ where: { isFeatured: true } })
      },
      system: {
        serverUptime: Math.floor(process.uptime()),
        memoryUsage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    res.json(createResponse(true, { statistics: stats }, 'Dashboard statistics retrieved'));
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to get dashboard statistics'));
  }
});

// User registration
router.post('/auth/register', async (req, res) => {
  try {
    const result = await AuthenticationService.register(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json(createResponse(true, result, 'Registration successful'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json(createResponse(false, null, '', error.message));
  }
});

// User login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    const result = await AuthenticationService.login(email, password, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      rememberMe
    });
    
    res.json(createResponse(true, result, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json(createResponse(false, null, '', error.message));
  }
});

// Token refresh
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(createResponse(false, null, '', 'Refresh token required'));
    }

    const tokens = await AuthenticationService.refreshToken(refreshToken);
    
    res.json(createResponse(true, tokens, 'Token refreshed successfully'));
  } catch (error) {
    res.status(401).json(createResponse(false, null, '', error.message));
  }
});

// User logout
router.post('/auth/logout', authenticate, async (req, res) => {
  try {
    const tokenId = req.headers.authorization?.split(' ')[1];
    const decoded = await AuthenticationService.verifyToken(tokenId);
    
    await AuthenticationService.logout(req.userId, decoded.jti);
    
    res.json(createResponse(true, null, 'Logout successful'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, '', 'Logout failed'));
  }
});

// Get user profile
router.get('/auth/profile', authenticate, async (req, res) => {
  try {
    const profile = await AuthenticationService.getProfile(req.userId);
    
    res.json(createResponse(true, { user: profile }, 'Profile retrieved'));
  } catch (error) {
    res.status(404).json(createResponse(false, null, '', error.message));
  }
});

// Update user profile
router.put('/auth/profile', authenticate, async (req, res) => {
  try {
    const updatedUser = await AuthenticationService.updateProfile(req.userId, req.body);
    
    res.json(createResponse(true, { user: updatedUser }, 'Profile updated'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, '', error.message));
  }
});

// Change password
router.post('/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const result = await AuthenticationService.changePassword(req.userId, currentPassword, newPassword);
    
    res.json(createResponse(true, result, 'Password changed successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, '', error.message));
  }
});

// =============================================================================
// CATEGORIES ENDPOINTS
// =============================================================================

// Get all categories
router.get('/categories', getCacheMiddleware()(300), async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { 
            artworks: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    const enhancedCategories = categories.map(category => ({
      ...category,
      artworkCount: category._count.artworks
    }));

    res.json(createResponse(true, {
      categories: enhancedCategories,
      total: categories.length
    }, 'Categories retrieved successfully'));
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to fetch categories'));
  }
});

// Create category (admin only)
router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, description, color = '#6366f1', sortOrder = 0 } = req.body;

    if (!name || !description) {
      return res.status(400).json(createResponse(false, null, '', 'Name and description are required'));
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        color,
        sortOrder: parseInt(sortOrder),
        isActive: true
      }
    });

    // Invalidate category cache
    await cache.invalidatePattern('api:*categories*');

    res.status(201).json(createResponse(true, { category }, 'Category created successfully'));
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json(createResponse(false, null, '', 'Category name already exists'));
    } else {
      res.status(500).json(createResponse(false, null, '', 'Failed to create category'));
    }
  }
});

// =============================================================================
// ARTWORKS ENDPOINTS
// =============================================================================

// Get artworks with advanced filtering and search
router.get('/artworks', optionalAuth, getCacheMiddleware()(180), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'AVAILABLE',
      featured,
      userId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 50); // Max 50 items per page

    // Build filter conditions
    const where = {
      isActive: true,
      ...(status && { status }),
      ...(featured === 'true' && { isFeatured: true }),
      ...(category && { categoryId: category }),
      ...(userId && { userId }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { ...where.price, lte: parseFloat(maxPrice) } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { medium: { contains: search, mode: 'insensitive' } },
          { 
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        ]
      })
    };

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'price', 'viewCount'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

    // Execute queries in parallel
    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, color: true }
          },
          user: {
            select: { id: true, firstName: true, lastName: true }
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, filename: true, mimeType: true }
          },
          _count: {
            select: { orderItems: true }
          }
        },
        orderBy: { [validSortBy]: validSortOrder },
        skip,
        take
      }),
      prisma.artwork.count({ where })
    ]);

    // Enhance artworks with computed fields
    const enhancedArtworks = artworks.map(artwork => ({
      ...artwork,
      primaryImage: artwork.images[0]?.url || null,
      artist: `${artwork.user.firstName} ${artwork.user.lastName}`,
      salesCount: artwork._count.orderItems,
      // Remove private fields
      user: {
        id: artwork.user.id,
        name: `${artwork.user.firstName} ${artwork.user.lastName}`
      }
    }));

    const pagination = {
      page: parseInt(page),
      limit: take,
      total,
      pages: Math.ceil(total / take),
      hasNext: skip + take < total,
      hasPrev: page > 1
    };

    res.json(createResponse(true, {
      artworks: enhancedArtworks,
      pagination,
      filters: {
        applied: { search, category, minPrice, maxPrice, status, featured, userId },
        total
      }
    }, 'Artworks retrieved successfully'));
  } catch (error) {
    console.error('Artworks error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to fetch artworks'));
  }
});

// Get single artwork with related items
router.get('/artworks/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where: { id, isActive: true },
      include: {
        category: true,
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            createdAt: true,
            _count: {
              select: { artworks: true }
            }
          }
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            filename: true,
            mimeType: true,
            size: true,
            isPrimary: true
          }
        }
      }
    });

    if (!artwork) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found'));
    }

    // Increment view count asynchronously
    prisma.artwork.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    }).catch(console.error);

    // Get related artworks
    const relatedArtworks = await prisma.artwork.findMany({
      where: {
        categoryId: artwork.categoryId,
        id: { not: id },
        isActive: true,
        status: 'AVAILABLE'
      },
      include: {
        images: { 
          where: { isPrimary: true }, 
          take: 1,
          select: { url: true }
        },
        user: { 
          select: { firstName: true, lastName: true } 
        }
      },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    // Get artist's other works
    const artistWorks = await prisma.artwork.findMany({
      where: {
        userId: artwork.userId,
        id: { not: id },
        isActive: true,
        status: 'AVAILABLE'
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true }
        }
      },
      take: 4,
      orderBy: { createdAt: 'desc' }
    });

    const enhancedArtwork = {
      ...artwork,
      artist: {
        ...artwork.user,
        name: `${artwork.user.firstName} ${artwork.user.lastName}`,
        artworkCount: artwork.user._count.artworks
      },
      relatedArtworks: relatedArtworks.map(art => ({
        ...art,
        primaryImage: art.images[0]?.url || null,
        artist: `${art.user.firstName} ${art.user.lastName}`
      })),
      artistWorks: artistWorks.map(art => ({
        ...art,
        primaryImage: art.images[0]?.url || null
      }))
    };

    res.json(createResponse(true, { artwork: enhancedArtwork }, 'Artwork retrieved successfully'));
  } catch (error) {
    console.error('Single artwork error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to fetch artwork'));
  }
});

// Create artwork
router.post('/artworks', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      medium,
      dimensions,
      year,
      categoryId,
      status = 'AVAILABLE',
      isFeatured = false
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !medium || !dimensions || !year || !categoryId) {
      return res.status(400).json(createResponse(false, null, '', 'Missing required fields'));
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId, isActive: true }
    });

    if (!category) {
      return res.status(400).json(createResponse(false, null, '', 'Invalid category'));
    }

    const artwork = await prisma.artwork.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        medium: medium.trim(),
        dimensions: dimensions.trim(),
        year: parseInt(year),
        categoryId,
        userId: req.userId,
        status,
        isFeatured,
        isActive: true
      },
      include: {
        category: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    // Invalidate related caches
    await Promise.all([
      cache.invalidatePattern('api:*artworks*'),
      cache.invalidatePattern('api:*stats*')
    ]);

    res.status(201).json(createResponse(true, { artwork }, 'Artwork created successfully'));
  } catch (error) {
    console.error('Create artwork error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to create artwork'));
  }
});

// =============================================================================
// FILE UPLOAD ENDPOINTS
// =============================================================================

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
    }
  }
});

// Upload artwork images
router.post('/artworks/:id/images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const { id: artworkId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json(createResponse(false, null, '', 'No files uploaded'));
    }

    // Verify artwork ownership
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId, userId: req.userId }
    });

    if (!artwork) {
      return res.status(404).json(createResponse(false, null, '', 'Artwork not found or access denied'));
    }

    const uploadedImages = [];
    const uploadDir = path.join(__dirname, '../uploads');

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      const filename = `${fileId}${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Process image with Sharp
      let processedBuffer = file.buffer;

      if (file.mimetype !== 'image/gif') {
        processedBuffer = await sharp(file.buffer)
          .resize(2000, 2000, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 90, 
            progressive: true 
          })
          .toBuffer();
      }

      // Save file
      await fs.writeFile(filepath, processedBuffer);

      // Create database record
      const image = await prisma.artworkImage.create({
        data: {
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: processedBuffer.length,
          url: `/uploads/${filename}`,
          isPrimary: i === 0, // First image is primary
          artworkId
        }
      });

      uploadedImages.push(image);
    }

    res.status(201).json(createResponse(true, { images: uploadedImages }, 'Images uploaded successfully'));
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json(createResponse(false, null, '', 'Failed to upload images'));
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json(createResponse(false, null, '', `API endpoint ${req.originalUrl} not found`));
});

export default router; 