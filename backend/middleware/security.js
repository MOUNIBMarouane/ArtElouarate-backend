/**
 * 🔒 ELOUARATE ART - Advanced Security Middleware
 * Enterprise-grade security for production deployment
 */

import rateLimit from 'express-rate-limit';
import validator from 'validator';

// =============================================================================
// ADVANCED RATE LIMITING
// =============================================================================

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Use IP + User-Agent for more specific rate limiting
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

// Registration specific rate limiting (stricter)
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again in 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `registration-${req.ip}`
});

// API general rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// =============================================================================
// INPUT VALIDATION & SANITIZATION
// =============================================================================

// Advanced email validation
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  // Basic format check
  if (!validator.isEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check for common dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }
  
  // Length check
  if (email.length > 254) {
    return { valid: false, error: 'Email too long' };
  }
  
  return { valid: true, sanitized: validator.normalizeEmail(email.toLowerCase()) };
};

// Advanced password validation
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  // Length check
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password too long' };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    '123456', 'password', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', '12345678'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password too common. Please choose a stronger password.' };
  }
  
  return { valid: true };
};

// Name validation and sanitization
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  // Trim and check length
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: `${fieldName} too long (max 50 characters)` };
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /<\/script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: `${fieldName} contains invalid characters` };
    }
  }
  
  // Allow only letters, spaces, hyphens, and apostrophes
  const namePattern = /^[a-zA-Z\s\-'\.]+$/;
  if (!namePattern.test(trimmed)) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }
  
  return { 
    valid: true, 
    sanitized: validator.escape(trimmed) // HTML escape for extra safety
  };
};

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: true, sanitized: null }; // Phone is optional
  }
  
  if (typeof phone !== 'string') {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check length (most phone numbers are 7-15 digits)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number must be 7-15 digits' };
  }
  
  return { 
    valid: true, 
    sanitized: phone.trim() 
  };
};

// =============================================================================
// SECURITY MIDDLEWARE FUNCTIONS
// =============================================================================

// Request size limiter
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request too large',
      message: 'Request size exceeds 10MB limit'
    });
  }
  
  next();
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Don't expose server info
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection attempts
    /drop.*table/i,   // SQL injection attempts
    /exec\(/i,        // Code execution attempts
    /eval\(/i         // Code execution attempts
  ];
  
  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  let isSuspicious = false;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      isSuspicious = true;
      break;
    }
  }
  
  if (isSuspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST: ${req.method} ${req.url} from ${req.ip}`);
    console.warn(`   User-Agent: ${req.get('User-Agent')}`);
    console.warn(`   Payload: ${requestData.substring(0, 200)}...`);
  }
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400 || isSuspicious) {
      console.log(`🔒 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    }
  });
  
  next();
};

// Advanced authentication middleware with better error handling
export const enhancedAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a Bearer token in the Authorization header'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication format',
        message: 'Authorization header must start with "Bearer "'
      });
    }
    
    const token = authHeader.substring(7);
    
    if (!token || token.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Missing token',
        message: 'Bearer token is required'
      });
    }
    
    // Token format validation (basic JWT format check)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token is not a valid JWT'
      });
    }
    
    req.token = token;
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal authentication error'
    });
  }
};

// =============================================================================
// VALIDATION MIDDLEWARE CREATORS
// =============================================================================

// Registration validation middleware
export const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName, phone } = req.body;
  const errors = [];
  
  // Validate email
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    errors.push(emailCheck.error);
  } else {
    req.body.email = emailCheck.sanitized;
  }
  
  // Validate password
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    errors.push(passwordCheck.error);
  }
  
  // Validate first name
  const firstNameCheck = validateName(firstName, 'First name');
  if (!firstNameCheck.valid) {
    errors.push(firstNameCheck.error);
  } else {
    req.body.firstName = firstNameCheck.sanitized;
  }
  
  // Validate last name
  const lastNameCheck = validateName(lastName, 'Last name');
  if (!lastNameCheck.valid) {
    errors.push(lastNameCheck.error);
  } else {
    req.body.lastName = lastNameCheck.sanitized;
  }
  
  // Validate phone (optional)
  if (phone) {
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      errors.push(phoneCheck.error);
    } else {
      req.body.phone = phoneCheck.sanitized;
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: errors.join('. '),
      errors: errors
    });
  }
  
  next();
};

// Login validation middleware
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  
  // Validate email
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    errors.push(emailCheck.error);
  } else {
    req.body.email = emailCheck.sanitized;
  }
  
  // Basic password check for login (don't reveal too much)
  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid credentials format',
      message: 'Please check your email and password format'
    });
  }
  
  next();
};

export default {
  authRateLimit,
  registrationRateLimit,
  apiRateLimit,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  requestSizeLimiter,
  securityHeaders,
  securityLogger,
  enhancedAuth,
  validateRegistration,
  validateLogin
};