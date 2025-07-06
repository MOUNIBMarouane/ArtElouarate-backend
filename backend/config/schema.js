/**
 * Database Schema Definition
 * Clean table creation and management
 */

import { logger } from '../utils/logger.js';

/**
 * Create all database tables
 */
export async function createTables(pool) {
    const tables = [
        createCategoriesTable,
        createArtworksTable,
        createArtworkImagesTable,
        createUsersTable,
        createAdminsTable,
        createInquiriesTable,
        createIndexes
    ];

    for (const createTable of tables) {
        await createTable(pool);
    }
}

/**
 * Categories table
 */
async function createCategoriesTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      color VARCHAR(7) DEFAULT '#6366f1',
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('📂 Categories table ready');
}

/**
 * Artworks table
 */
async function createArtworksTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS artworks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      artist VARCHAR(255),
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      original_price DECIMAL(10,2),
      medium VARCHAR(255),
      dimensions VARCHAR(255),
      year INTEGER,
      status VARCHAR(50) DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
      is_active BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      view_count INTEGER DEFAULT 0,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('🎨 Artworks table ready');
}

/**
 * Artwork images table (for multiple images per artwork)
 */
async function createArtworkImagesTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS artwork_images (
      id SERIAL PRIMARY KEY,
      artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255),
      mime_type VARCHAR(100),
      size INTEGER,
      url TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('🖼️  Artwork images table ready');
}

/**
 * Users table (for customers)
 */
async function createUsersTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      date_of_birth DATE,
      is_active BOOLEAN DEFAULT true,
      is_email_verified BOOLEAN DEFAULT false,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('👤 Users table ready');
}

/**
 * Admins table
 */
async function createAdminsTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      role VARCHAR(50) DEFAULT 'ADMIN',
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('🔐 Admins table ready');
}

/**
 * Inquiries table (contact form submissions)
 */
async function createInquiriesTable(pool) {
    const query = `
    CREATE TABLE IF NOT EXISTS inquiries (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'NEW' 
        CHECK (status IN ('NEW', 'READ', 'REPLIED', 'CLOSED')),
      artwork_id INTEGER REFERENCES artworks(id),
      admin_reply TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

    await pool.query(query);
    logger.info('📬 Inquiries table ready');
}

/**
 * Create database indexes for performance
 */
async function createIndexes(pool) {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category_id)',
        'CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status)',
        'CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks(is_featured)',
        'CREATE INDEX IF NOT EXISTS idx_artworks_active ON artworks(is_active)',
        'CREATE INDEX IF NOT EXISTS idx_artwork_images_artwork ON artwork_images(artwork_id)',
        'CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active)',
        'CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order)',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)',
        'CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)',
    ];

    for (const indexQuery of indexes) {
        await pool.query(indexQuery);
    }

    logger.info('📊 Database indexes ready');
}