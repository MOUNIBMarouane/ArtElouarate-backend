/**
 * 🎨 Professional Authentication Service
 * Enterprise-grade authentication with advanced security features
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import cache from '../lib/cache-pro.js';

const prisma = new PrismaClient();

// Security configuration
const SECURITY_CONFIG = {
  bcryptRounds: 12,
  jwtExpiresIn: '15m',
  refreshExpiresIn: '7d',
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  passwordMaxLength: 128,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
};

class AuthenticationService {
  
  // =============================================================================
  // TOKEN MANAGEMENT
  // =============================================================================

  static generateSecureTokens(payload) {
    const accessToken = jwt.sign(
      {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
      },
      process.env.JWT_SECRET || 'fallback-secret-please-change-in-production',
      { expiresIn: SECURITY_CONFIG.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
      },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-please-change-in-production',
      { expiresIn: SECURITY_CONFIG.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  static async verifyToken(token, type = 'access') {
    try {
      const secret = type === 'access' 
        ? (process.env.JWT_SECRET || 'fallback-secret-please-change-in-production')
        : (process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-please-change-in-production');

      const decoded = jwt.verify(token, secret);
      
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      // Check if token is blacklisted
      const blacklisted = await cache.get(`blacklist:${decoded.jti}`);
      if (blacklisted) {
        throw new Error('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  static async revokeToken(tokenId) {
    try {
      // Add token to blacklist
      await cache.set(`blacklist:${tokenId}`, true, 7 * 24 * 60 * 60); // 7 days
      return true;
    } catch (error) {
      console.error('Token revocation error:', error);
      return false;
    }
  }

  // =============================================================================
  // PASSWORD SECURITY
  // =============================================================================

  static validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < SECURITY_CONFIG.passwordMinLength) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.passwordMinLength} characters long`);
    }

    if (password.length > SECURITY_CONFIG.passwordMaxLength) {
      errors.push(`Password must be no more than ${SECURITY_CONFIG.passwordMaxLength} characters long`);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[@$!%*?&]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9@$!%*?&]/.test(password)) score += 5;
    
    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 15; // Sequential characters
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 90) return 'strong';
    return 'very-strong';
  }

  static async hashPassword(password) {
    return bcrypt.hash(password, SECURITY_CONFIG.bcryptRounds);
  }

  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // =============================================================================
  // RATE LIMITING & SECURITY
  // =============================================================================

  static async checkLoginAttempts(identifier) {
    const key = `login_attempts:${identifier}`;
    const attempts = await cache.get(key) || 0;
    
    if (attempts >= SECURITY_CONFIG.maxLoginAttempts) {
      const lockoutKey = `lockout:${identifier}`;
      const lockedUntil = await cache.get(lockoutKey);
      
      if (lockedUntil && Date.now() < lockedUntil) {
        const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
        throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
      }
    }
    
    return attempts;
  }

  static async recordLoginAttempt(identifier, success = false) {
    const key = `login_attempts:${identifier}`;
    
    if (success) {
      // Reset attempts on successful login
      await cache.delete(key);
      await cache.delete(`lockout:${identifier}`);
    } else {
      // Increment failed attempts
      const attempts = await cache.get(key) || 0;
      const newAttempts = attempts + 1;
      
      // Set attempts with expiry
      await cache.set(key, newAttempts, 15 * 60); // 15 minutes
      
      // Lock account if max attempts reached
      if (newAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
        const lockoutUntil = Date.now() + SECURITY_CONFIG.lockoutDuration;
        await cache.set(`lockout:${identifier}`, lockoutUntil, SECURITY_CONFIG.lockoutDuration / 1000);
      }
    }
  }

  // =============================================================================
  // USER REGISTRATION
  // =============================================================================

  static async register(userData, options = {}) {
    const { email, password, firstName, lastName, phone, role = 'USER', metadata = {} } = userData;
    const { ipAddress, userAgent } = options;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields: email, password, firstName, lastName');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    try {
      // Create user in transaction
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone?.trim() || null,
            role,
            emailVerificationToken: role === 'ADMIN' ? null : emailVerificationToken,
            isEmailVerified: role === 'ADMIN' ? true : false,
            metadata: {
              ...metadata,
              registrationIP: ipAddress,
              registrationUserAgent: userAgent,
              passwordStrength: passwordValidation.strength
            }
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            isEmailVerified: true,
            createdAt: true
          }
        });

        return newUser;
      });

      // Generate tokens
      const tokens = this.generateSecureTokens({
        userId: user.id,
        email: user.email,
        role: 'USER'
      });

      // Log successful registration
      console.log(`✅ User registered: ${user.email} (${user.id})`);

      return {
        user,
        ...tokens,
        emailVerificationToken,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed: ' + error.message);
    }
  }

  // =============================================================================
  // USER AUTHENTICATION
  // =============================================================================

  static async login(email, password, options = {}) {
    const { ipAddress, userAgent, rememberMe = false } = options;
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check login attempts
    await this.checkLoginAttempts(normalizedEmail);

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          metadata: true
        }
      });

      if (!user) {
        await this.recordLoginAttempt(normalizedEmail, false);
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        await this.recordLoginAttempt(normalizedEmail, false);
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        await this.recordLoginAttempt(normalizedEmail, false);
        throw new Error('Invalid email or password');
      }

      // Update user login info
      const loginData = {
        lastLogin: new Date(),
        metadata: {
          ...user.metadata,
          lastLoginIP: ipAddress,
          lastLoginUserAgent: userAgent,
          loginCount: (user.metadata?.loginCount || 0) + 1
        }
      };

      await prisma.user.update({
        where: { id: user.id },
        data: loginData
      });

      // Record successful login
      await this.recordLoginAttempt(normalizedEmail, true);

      // Generate tokens
      const tokenExpiry = rememberMe ? '30d' : SECURITY_CONFIG.jwtExpiresIn;
      const tokens = this.generateSecureTokens({
        userId: user.id,
        email: user.email,
        role: 'USER'
      });

      // Cache user session
      await cache.set(
        `session:${user.id}`,
        {
          userId: user.id,
          email: user.email,
          loginTime: Date.now(),
          ipAddress,
          userAgent
        },
        SECURITY_CONFIG.sessionTimeout / 1000
      );

      // Remove sensitive data
      const { password: _, emailVerificationToken: __, ...userResponse } = user;

      console.log(`✅ User logged in: ${user.email} (${user.id})`);

      return {
        user: userResponse,
        ...tokens,
        session: {
          expiresAt: Date.now() + SECURITY_CONFIG.sessionTimeout,
          rememberMe
        },
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  static async refreshToken(refreshToken) {
    try {
      const decoded = await this.verifyToken(refreshToken, 'refresh');
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          isActive: true,
          isEmailVerified: true
        }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Revoke old refresh token
      await this.revokeToken(decoded.jti);

      // Generate new tokens
      const tokens = this.generateSecureTokens({
        userId: user.id,
        email: user.email,
        role: 'USER'
      });

      return tokens;
    } catch (error) {
      throw new Error('Token refresh failed: ' + error.message);
    }
  }

  static async logout(userId, tokenId = null) {
    try {
      // Revoke token if provided
      if (tokenId) {
        await this.revokeToken(tokenId);
      }

      // Clear user session
      await cache.delete(`session:${userId}`);

      console.log(`✅ User logged out: ${userId}`);
      return { message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  static async logoutAllDevices(userId) {
    try {
      // This would require storing all active tokens in a database
      // For now, we'll clear the session and rely on token expiry
      await cache.delete(`session:${userId}`);
      
      // In a production system, you'd want to:
      // 1. Store all active tokens in database
      // 2. Add all tokens to blacklist
      // 3. Force user to re-authenticate
      
      console.log(`✅ All devices logged out for user: ${userId}`);
      return { message: 'Logged out from all devices' };
    } catch (error) {
      console.error('Logout all devices error:', error);
      throw new Error('Logout from all devices failed');
    }
  }

  // =============================================================================
  // USER PROFILE MANAGEMENT
  // =============================================================================

  static async getProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          _count: {
            select: {
              artworks: true,
              orders: true,
              inquiries: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        ...user,
        stats: {
          artworksCreated: user._count.artworks,
          ordersPlaced: user._count.orders,
          inquiriesSent: user._count.inquiries
        }
      };
    } catch (error) {
      throw new Error('Failed to get profile: ' + error.message);
    }
  }

  static async updateProfile(userId, updateData) {
    const allowedFields = ['firstName', 'lastName', 'phone'];
    const filteredData = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]?.trim();
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...filteredData,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          updatedAt: true
        }
      });

      // Invalidate user cache
      await cache.delete(`session:${userId}`);

      return user;
    } catch (error) {
      throw new Error('Failed to update profile: ' + error.message);
    }
  }

  static async changePassword(userId, currentPassword, newPassword) {
    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      // Get user with current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, password: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword,
          metadata: {
            passwordChanged: new Date(),
            passwordStrength: passwordValidation.strength
          }
        }
      });

      // Clear all sessions (force re-login)
      await this.logoutAllDevices(userId);

      console.log(`✅ Password changed for user: ${user.email}`);
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new Error('Failed to change password: ' + error.message);
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  static async validateSession(userId) {
    try {
      const session = await cache.get(`session:${userId}`);
      return session && session.loginTime > Date.now() - SECURITY_CONFIG.sessionTimeout;
    } catch (error) {
      return false;
    }
  }

  static async getUserSessions(userId) {
    try {
      const session = await cache.get(`session:${userId}`);
      return session ? [session] : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Admin login with enhanced security
   */
  static async adminLogin(email, password, context = {}) {
    try {
      const { ipAddress, userAgent } = context;
      
      // Find admin user
      const admin = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          role: 'ADMIN',
          isActive: true
        }
      });

      if (!admin) {
        throw new Error('Invalid admin credentials');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, admin.password);
      if (!isPasswordValid) {
        throw new Error('Invalid admin credentials');
      }

      // Generate tokens
      const tokens = this.generateSecureTokens({
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });

      // Update admin login info
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          lastLogin: new Date(),
          lastLoginIP: ipAddress,
          lastLoginUserAgent: userAgent
        }
      });

      console.log(`✅ Admin login successful: ${admin.email}`);

      return {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        },
        ...tokens
      };

    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }
}

export default AuthenticationService; 