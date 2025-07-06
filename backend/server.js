/**
 * 🎨 ELOUARATE ART - Professional Backend Server
 * Clean, modular, and scalable architecture
 */

import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from './config/app.js';
import { connectDatabase } from './config/database.js';
import { setupRoutes } from './routes/index.js';
import { setupMiddleware } from './middleware/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Server startup sequence
 */
async function startServer() {
  try {
    logger.info('🎨 Starting ELOUARATE ART Backend...');

    // 1. Initialize database connection
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // 2. Setup middleware
    setupMiddleware(app);
    logger.info('✅ Middleware configured');

    // 3. Setup routes
    setupRoutes(app);
    logger.info('✅ Routes configured');

    // 4. Setup error handling (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // 5. Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('🚀 Server Configuration:');
      logger.info(`   📍 Port: ${PORT}`);
      logger.info(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   🗄️  Database: Connected`);
      logger.info('✅ ELOUARATE ART Backend Ready!');

      // Display available endpoints
      logger.info('📋 Available Endpoints:');
      logger.info('   🏥 GET  /health           - Health check');
      logger.info('   📂 GET  /api/categories   - Categories');
      logger.info('   🎨 GET  /api/artworks     - Artworks');
      logger.info('   🔐 POST /api/admin/login  - Admin login');
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

/**
 * Graceful server shutdown
 */
async function gracefulShutdown(server) {
  logger.info('📴 Shutting down gracefully...');

  server.close(async () => {
    try {
      // Close database connections
      const { closeDatabase } = await import('./config/database.js');
      await closeDatabase();
      logger.info('✅ Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
}

// Start the server
startServer();

export default app;