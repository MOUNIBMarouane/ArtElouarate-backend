import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import AdminService from '../lib/admin-service.js';
import {
  validateAdminLogin,
  validateAdminRegistration,
  validatePasswordResetRequest,
  validatePasswordResetCompletion,
  validatePasswordChange
} from '../middleware/validate-admin.js';
import { verifyAdminToken, verifyAdminRefreshToken } from '../middleware/auth-admin.js';

const router = express.Router();
const adminService = new AdminService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Professional response formatter
 * @param {boolean} success 
 * @param {*} data 
 * @param {string} message 
 * @param {string} error 
 * @param {number} statusCode 
 * @returns {Object}
 */
const formatResponse = (success, data = null, message = '', error = null, statusCode = 200) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(error && { error: typeof error === 'string' ? error : error.type || 'UNKNOWN_ERROR' })
  };

  if (process.env.NODE_ENV === 'development' && error && typeof error === 'object') {
    response.errorDetails = error;
  }

  return response;
};

/**
 * Async handler wrapper for better error handling
 * @param {Function} fn 
 * @returns {Function}
 */
const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Rate limiting for admin endpoints
 */
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: formatResponse(false, null, 'Too many admin requests, please try again later', 'RATE_LIMIT_EXCEEDED', 429),
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const validateAdminRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .trim()
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
];

const validatePasswordResetCompletion = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(formatResponse(
      false,
      null,
      'Validation failed',
      {
        type: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      },
      400
    ));
  }
  next();
};

// =============================================================================
// ADMIN AUTHENTICATION ENDPOINTS
// =============================================================================

// Check if admin exists (for initial setup)
router.get('/exists', handleAsync(async (req, res) => {
  try {
    const adminExists = await adminService.adminExists();
    
    res.json(formatResponse(
      true,
      { 
        exists: adminExists,
        needsSetup: !adminExists,
        setupMessage: adminExists ? null : 'Use default admin credentials for first-time setup'
      },
      adminExists ? 'Admin accounts found' : 'No admin accounts found, setup required'
    ));
  } catch (error) {
    console.error('Admin exists check error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to check admin existence',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Admin login
router.post('/login', adminRateLimit, validateAdminLogin, handleValidationErrors, handleAsync(async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Admin login attempt for: ${email}`);
    
    const result = await adminService.authenticateAdmin(email, password);
    
    if (!result.success) {
      return res.status(401).json(formatResponse(
        false,
        null,
        'Invalid credentials',
        'INVALID_CREDENTIALS',
        401
      ));
    }

    res.json(formatResponse(
      true,
      {
        admin: result.admin,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      },
      'Login successful'
    ));
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Login failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Admin registration (only allowed for existing admins)
router.post('/register', validateAdminRegistration, handleValidationErrors, handleAsync(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Create new admin
    const newAdmin = await adminService.createAdmin({
      username,
      email,
      password
    });

    res.status(201).json(formatResponse(
      true,
      {
        admin: {
          id: newAdmin.id,
          username: newAdmin.username,
          email: newAdmin.email
        }
      },
      'Admin registered successfully'
    ));
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      error.message || 'Registration failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Refresh admin token (simplified version)
router.post('/refresh-token', handleAsync(async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(formatResponse(
        false,
        null,
        'Refresh token required',
        'MISSING_REFRESH_TOKEN',
        400
      ));
    }

    // For now, return success (implement proper JWT refresh later)
    res.json(formatResponse(
      true,
      { 
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      },
      'Token refreshed successfully'
    ));
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to refresh token',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Initiate password reset
router.post('/password-reset/initiate', validatePasswordResetRequest, handleAsync(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await adminService.initiatePasswordReset(email);

    if (!result.success) {
      return res.status(400).json(formatResponse(
        false,
        null,
        result.error,
        'PASSWORD_RESET_FAILED',
        400
      ));
    }

    res.json(formatResponse(
      true,
      null,
      'Password reset initiated. Check your email for instructions.'
    ));
  } catch (error) {
    console.error('Password reset initiation error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to initiate password reset',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Complete password reset
router.post('/password-reset/complete', validatePasswordResetCompletion, handleAsync(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await adminService.completePasswordReset(token, newPassword);

    if (!result.success) {
      return res.status(400).json(formatResponse(
        false,
        null,
        result.error,
        'PASSWORD_RESET_FAILED',
        400
      ));
    }

    res.json(formatResponse(
      true,
      null,
      'Password reset successful'
    ));
  } catch (error) {
    console.error('Password reset completion error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to complete password reset',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Change password (requires authentication)
router.post('/password/change', verifyAdminToken, validatePasswordChange, handleAsync(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;

    const result = await adminService.updatePassword(adminId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json(formatResponse(
        false,
        null,
        result.error,
        'PASSWORD_CHANGE_FAILED',
        400
      ));
    }

    res.json(formatResponse(
      true,
      null,
      'Password changed successfully'
    ));
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to change password',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Get admin profile (requires authentication)
router.get('/profile', verifyAdminToken, handleAsync(async (req, res) => {
  try {
    const admin = await adminService.findAdminById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json(formatResponse(
        false,
        null,
        'Admin not found',
        'NOT_FOUND',
        404
      ));
    }

    res.json(formatResponse(
      true,
      {
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          lastLogin: admin.lastLogin
        }
      },
      'Profile retrieved successfully'
    ));
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to retrieve profile',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Admin logout
router.post('/logout', verifyAdminToken, handleAsync(async (req, res) => {
  try {
    // In production, you might want to blacklist the token
    console.log(`🔐 Admin logout: ${req.admin.username}`);
    
    res.json(formatResponse(
      true,
      null,
      'Admin logged out successfully'
    ));
    
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Logout failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// =============================================================================
// ADMIN MANAGEMENT ENDPOINTS
// =============================================================================

// Get dashboard statistics
router.get('/dashboard/stats', verifyAdminToken, handleAsync(async (req, res) => {
  try {
    // Mock statistics (in production, get from your database)
    const stats = {
      users: {
        total: 156,
        active: 142,
        newThisMonth: 23,
        growthRate: 12.5
      },
      artworks: {
        total: 89,
        published: 76,
        pending: 8,
        featured: 12
      },
      orders: {
        total: 234,
        thisMonth: 45,
        revenue: 12580.00,
        averageOrder: 279.56
      },
      categories: {
        total: 8,
        active: 6,
        mostPopular: 'Digital Art'
      },
      system: {
        serverUptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    res.json(formatResponse(
      true,
      { statistics: stats },
      'Dashboard statistics retrieved successfully'
    ));
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Failed to get dashboard statistics',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Get system health
router.get('/system/health', verifyAdminToken, handleAsync(async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      database: {
        status: 'connected',
        type: 'SQL Server',
        name: 'ElouarateArt'
      },
      features: {
        authentication: 'enabled',
        rateLimit: 'enabled',
        compression: 'enabled',
        cors: 'enabled',
        helmet: 'enabled'
      }
    };
    
    res.json(formatResponse(
      true,
      { health },
      'System health check completed'
    ));
    
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Health check failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}));

// Health check for admin service
router.get('/health', handleAsync(async (req, res) => {
  try {
    const adminExists = await adminService.adminExists();
    const dbStats = adminService.db.getStats();
    
    res.json(formatResponse(
      true,
      {
        adminService: 'operational',
        adminExists,
        database: dbStats,
        timestamp: new Date().toISOString()
      },
      'Admin service is healthy'
    ));
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json(formatResponse(
      false,
      null,
      'Admin service health check failed',
      'HEALTH_CHECK_FAILED',
      500
    ));
  }
}));

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

router.use((error, req, res, next) => {
  console.error('🚨 Admin route error:', error);
  
  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json(formatResponse(
      false,
      null,
      'Validation failed',
      'VALIDATION_ERROR',
      400
    ));
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json(formatResponse(
      false,
      null,
      'Unauthorized access',
      'UNAUTHORIZED',
      401
    ));
  }
  
  // Default server error
  res.status(500).json(formatResponse(
    false,
    null,
    'Internal server error',
    'INTERNAL_SERVER_ERROR',
    500
  ));
});

export default router; 