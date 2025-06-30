import jwt from 'jsonwebtoken';
import AdminService from '../lib/admin-service.js';

const adminService = new AdminService();

// Format error response
const formatError = (message, error = 'UNAUTHORIZED', statusCode = 401) => ({
  success: false,
  message,
  error,
  statusCode,
  timestamp: new Date().toISOString()
});

/**
 * Verify admin JWT token
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatError('No token provided'));
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'development-jwt-secret'
      );

      // Ensure token is for admin
      if (decoded.type !== 'admin') {
        return res.status(401).json(formatError('Invalid token type'));
      }

      // Get admin from database
      const admin = await adminService.findAdminById(decoded.id);
      
      if (!admin) {
        return res.status(401).json(formatError('Admin not found'));
      }

      if (!admin.isActive) {
        return res.status(401).json(formatError('Admin account is inactive'));
      }

      // Attach admin to request
      req.admin = {
        id: admin.id,
        username: admin.username,
        email: admin.email
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(formatError('Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(formatError('Invalid token'));
      }
      throw error;
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json(formatError(
      'Authentication failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
};

/**
 * Verify admin refresh token
 */
export const verifyAdminRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json(formatError('No refresh token provided'));
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'development-refresh-secret'
      );

      // Ensure token is for admin refresh
      if (decoded.type !== 'admin_refresh') {
        return res.status(401).json(formatError('Invalid refresh token type'));
      }

      // Get admin from database
      const admin = await adminService.findAdminById(decoded.id);
      
      if (!admin) {
        return res.status(401).json(formatError('Admin not found'));
      }

      if (!admin.isActive) {
        return res.status(401).json(formatError('Admin account is inactive'));
      }

      // Generate new tokens
      const tokens = adminService.generateTokens(admin);

      // Attach tokens to response
      res.locals.tokens = tokens;
      
      // Attach admin to request
      req.admin = {
        id: admin.id,
        username: admin.username,
        email: admin.email
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(formatError('Refresh token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(formatError('Invalid refresh token'));
      }
      throw error;
    }
  } catch (error) {
    console.error('Admin refresh error:', error);
    res.status(500).json(formatError(
      'Token refresh failed',
      'INTERNAL_SERVER_ERROR',
      500
    ));
  }
}; 