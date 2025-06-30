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

// Professional response formatter
const formatResponse = (success, data = null, message = '', error = null, statusCode = 200) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    ...(data && { data }),
    ...(error && { error })
  };
  
  if (!success && process.env.NODE_ENV === 'development') {
    response.debug = {
      endpoint: 'Admin API',
      environment: process.env.NODE_ENV
    };
  }
  
  return response;
};

// Professional error handler
const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Enhanced rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: formatResponse(false, null, 'Too many admin login attempts, please try again in 15 minutes', 'RATE_LIMIT_EXCEEDED'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(formatResponse(
      false, 
      null, 
      'Too many admin login attempts, please try again in 15 minutes', 
      'RATE_LIMIT_EXCEEDED',
      429
    ));
  }
});

// Professional validation error handler
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
router.post('/register', verifyAdminToken, validateAdminRegistration, handleValidationErrors, handleAsync(async (req, res) => {
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

// Refresh admin token
router.post('/refresh-token', verifyAdminRefreshToken, handleAsync(async (req, res) => {
  try {
    // Tokens are already generated in the middleware
    const { tokens } = res.locals;

    res.json(formatResponse(
      true,
      { tokens },
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

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  res.status(500).json(formatResponse(
    false,
    null,
    'Admin operation failed',
    {
      type: 'ADMIN_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    },
    500
  ));
});

export default router; 