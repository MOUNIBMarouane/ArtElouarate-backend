#!/usr/bin/env node

/**
 * 🧪 Middleware Testing Script
 * Test our middleware setup step by step
 */

import express from 'express';
import dotenv from 'dotenv';
import { logger } from './backend/utils/logger.js';

// Load test environment
dotenv.config({ path: './backend/.env.test' });

const app = express();
const PORT = 3001; // Use different port for testing

logger.info('🧪 Starting Middleware Tests...');

// Test 1: Basic Express Setup
logger.info('📝 Test 1: Basic Express setup');
try {
    app.get('/test', (req, res) => {
        res.json({ message: 'Basic Express works!' });
    });
    logger.success('✅ Basic Express setup works');
} catch (error) {
    logger.error('❌ Basic Express setup failed:', error);
    process.exit(1);
}

// Test 2: Logger Utility
logger.info('📝 Test 2: Logger utility');
try {
    logger.info('Info message test');
    logger.warn('Warning message test');
    logger.error('Error message test');
    logger.debug('Debug message test');
    logger.success('Success message test');
    logger.success('✅ Logger utility works');
} catch (error) {
    logger.error('❌ Logger utility failed:', error);
    process.exit(1);
}

// Test 3: Environment Variables
logger.info('📝 Test 3: Environment variables');
try {
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'NODE_ENV',
        'PORT',
        'ADMIN_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    logger.info(`   🔧 NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`   🗄️  Database: ${process.env.DB_NAME}`);
    logger.info(`   👤 Admin Email: ${process.env.ADMIN_EMAIL}`);
    logger.success('✅ Environment variables loaded');
} catch (error) {
    logger.error('❌ Environment variables test failed:', error);
    process.exit(1);
}

// Test 4: Import Existing Middleware
logger.info('📝 Test 4: Import existing middleware');
try {
    // Test importing your existing middleware files
    const { validateAdminLogin } = await import('./middleware/validate-admin.js');
    const { verifyAdminToken } = await import('./middleware/auth-admin.js');
    const securityMiddleware = await import('./middleware/security.js');
    const performanceMiddleware = await import('./middleware/performance.js');

    logger.info('   ✅ validate-admin.js imported');
    logger.info('   ✅ auth-admin.js imported');
    logger.info('   ✅ security.js imported');
    logger.info('   ✅ performance.js imported');
    logger.success('✅ All existing middleware imported successfully');
} catch (error) {
    logger.error('❌ Middleware import failed:', error);
    logger.error('   This might be due to missing dependencies or file paths');
    logger.info('   Let\'s check what\'s missing...');

    // Check individual imports
    try {
        await import('./middleware/validate-admin.js');
        logger.info('   ✅ validate-admin.js - OK');
    } catch (e) {
        logger.error('   ❌ validate-admin.js - FAILED:', e.message);
    }

    try {
        await import('./middleware/auth-admin.js');
        logger.info('   ✅ auth-admin.js - OK');
    } catch (e) {
        logger.error('   ❌ auth-admin.js - FAILED:', e.message);
    }

    try {
        await import('./middleware/security.js');
        logger.info('   ✅ security.js - OK');
    } catch (e) {
        logger.error('   ❌ security.js - FAILED:', e.message);
    }

    try {
        await import('./middleware/performance.js');
        logger.info('   ✅ performance.js - OK');
    } catch (e) {
        logger.error('   ❌ performance.js - FAILED:', e.message);
    }
}

// Test 5: Check Dependencies
logger.info('📝 Test 5: Check required dependencies');
try {
    const requiredPackages = [
        'express',
        'cors',
        'helmet',
        'compression',
        'express-rate-limit',
        'morgan',
        'dotenv',
        'bcryptjs',
        'jsonwebtoken',
        'express-validator',
        'validator',
        'pg'
    ];

    for (const pkg of requiredPackages) {
        try {
            await import(pkg);
            logger.info(`   ✅ ${pkg} - installed`);
        } catch (error) {
            logger.error(`   ❌ ${pkg} - MISSING`);
            logger.warn(`      Install with: npm install ${pkg}`);
        }
    }

    logger.success('✅ Dependency check completed');
} catch (error) {
    logger.error('❌ Dependency check failed:', error);
}

// Test 6: Basic Server Start
logger.info('📝 Test 6: Basic server startup');
try {
    const server = app.listen(PORT, () => {
        logger.success(`✅ Test server started on port ${PORT}`);

        // Test a simple request
        setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:${PORT}/test`);
                const data = await response.json();
                logger.success('✅ HTTP request test passed:', data.message);
            } catch (error) {
                logger.error('❌ HTTP request test failed:', error);
            }

            // Shutdown test server
            server.close(() => {
                logger.success('🎉 All basic tests completed!');
                logger.info('');
                logger.info('📋 Next Steps:');
                logger.info('   1. Install any missing dependencies');
                logger.info('   2. Fix any import errors');
                logger.info('   3. Test database connection');
                logger.info('   4. Test full middleware setup');
                process.exit(0);
            });
        }, 1000);
    });
} catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
}

// Handle process termination
process.on('SIGINT', () => {
    logger.info('📴 Test interrupted by user');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});