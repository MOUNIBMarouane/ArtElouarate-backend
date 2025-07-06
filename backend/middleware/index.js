/**
 * Middleware Configuration
 * Using existing middleware files from your project
 */

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import { logger } from '../utils/logger.js';

// Import your existing middleware
import securityMiddleware from '../middleware/security.js';
import { verifyAdminToken } from '../middleware/auth-admin.js';
import { validateAdminLogin } from '../middleware/validate-admin.js';

/**
 * Setup all middleware using existing files
 */
export function setupMiddleware(app) {
    // Security middleware from your security.js
    app.use(securityMiddleware.securityHeaders);

    // Basic security
    setupBasicSecurity(app);

    // CORS configuration
    setupCORS(app);

    // Rate limiting from your security.js
    app.use('/api/', securityMiddleware.apiRateLimit);
    app.use('/api/admin/', securityMiddleware.authRateLimit);

    // Body parsing with your request size limiter
    app.use(securityMiddleware.requestSizeLimiter);
    setupBodyParsing(app);

    // Logging
    setupLogging(app);

    // Compression
    app.use(compression());
}

/**
 * Basic security setup
 */
function setupBasicSecurity(app) {
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
}

/**
 * CORS configuration
 */
function setupCORS(app) {
    const allowedOrigins = [
        // Local development
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',

        // Production domains
        'https://artelouarrate-frontend-production.up.railway.app',
        'https://elouarateart.com',
        'https://www.elouarateart.com',

        // Railway patterns
        /^https:\/\/.*\.up\.railway\.app$/,
        /^https:\/\/.*\.railway\.app$/,
    ];

    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            // In production, be more permissive for Railway
            if (process.env.NODE_ENV === 'production') {
                return callback(null, true);
            }

            // Check against allowed origins
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
                logger.warn(`🚫 CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
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
}

/**
 * Body parsing middleware
 */
function setupBodyParsing(app) {
    app.use(express.json({
        limit: '10mb',
        type: 'application/json'
    }));

    app.use(express.urlencoded({
        extended: true,
        limit: '10mb'
    }));

    // Handle JSON parsing errors
    app.use((err, req, res, next) => {
        if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
            return res.status(400).json({
                success: false,
                message: 'Invalid JSON format',
                code: 'INVALID_JSON'
            });
        }
        next();
    });
}

/**
 * Logging middleware
 */
function setupLogging(app) {
    // Custom Morgan format
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

    app.use(morgan(morganFormat, {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Export your existing middleware for use in routes
export { verifyAdminToken, validateAdminLogin };
next();
  });
}

/**
 * Logging middleware
 */
function setupLogging(app) {
    // Custom Morgan format
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

    app.use(morgan(morganFormat, {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}