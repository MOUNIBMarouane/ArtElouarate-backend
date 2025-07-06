/**
 * Database Configuration and Connection Management
 * Clean and modular database setup
 */

import pg from 'pg';
import { logger } from '../utils/logger.js';
import { createTables } from '../database/schema.js';
import { seedDatabase } from '../database/seeds.js';

const { Pool } = pg;

let pool = null;

/**
 * Database configuration
 */
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'elouarate_art_local',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',

    // Connection pool settings
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,

    // SSL configuration
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
};

/**
 * Initialize database connection
 */
export async function connectDatabase() {
    try {
        // Create connection pool
        pool = new Pool(dbConfig);

        // Test connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as timestamp, version() as version');
        client.release();

        logger.info('🗄️  Database Details:');
        logger.info(`   📊 PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
        logger.info(`   ⏰ Server Time: ${result.rows[0].timestamp}`);
        logger.info(`   🔗 Database: ${dbConfig.database}`);

        // Initialize database schema
        await initializeSchema();

        return pool;
    } catch (error) {
        logger.error('❌ Database connection failed:', error.message);
        throw new Error(`Database connection failed: ${error.message}`);
    }
}

/**
 * Initialize database schema and seed data
 */
async function initializeSchema() {
    try {
        logger.info('🔧 Initializing database schema...');

        // Create tables
        await createTables(pool);
        logger.info('✅ Database tables ready');

        // Seed initial data
        await seedDatabase(pool);
        logger.info('✅ Sample data ready');

    } catch (error) {
        logger.error('❌ Schema initialization failed:', error);
        throw error;
    }
}

/**
 * Execute database query
 */
export async function query(text, params = []) {
    const startTime = Date.now();

    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - startTime;

        // Log slow queries (> 1000ms)
        if (duration > 1000) {
            logger.warn(`⚠️ Slow query (${duration}ms): ${text.substring(0, 100)}...`);
        }

        return result;
    } catch (error) {
        logger.error('❌ Database query failed:', error.message);
        logger.error('   Query:', text);
        throw error;
    }
}

/**
 * Get database connection status
 */
export async function getConnectionStatus() {
    try {
        if (!pool) return { connected: false, error: 'Pool not initialized' };

        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as timestamp');
        client.release();

        return {
            connected: true,
            timestamp: result.rows[0].timestamp,
            poolSize: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount
        };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

/**
 * Close database connections
 */
export async function closeDatabase() {
    try {
        if (pool) {
            await pool.end();
            pool = null;
            logger.info('✅ Database connections closed');
        }
    } catch (error) {
        logger.error('❌ Error closing database:', error);
    }
}

export { pool };