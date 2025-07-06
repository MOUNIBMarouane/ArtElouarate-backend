/**
 * Simple Middleware Setup
 */

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';

// Import your existing middleware
import { verifyAdminToken } from './auth-admin.js';
import { validateAdminLogin } from './validate-admin.js';

export function setupMiddleware(app) {
  // Basic security
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // CORS
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(morgan('combined'));

  // Compression
  app.use(compression());
}

// Export your existing middleware
export { verifyAdminToken, validateAdminLogin };
