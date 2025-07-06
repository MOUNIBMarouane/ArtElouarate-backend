/**
 * Database Seeding
 * Insert sample data for development and testing
 */

import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

/**
 * Seed the database with initial data
 */
export async function seedDatabase(pool) {
  await seedCategories(pool);
  await seedArtworks(pool);
  await seedAdmins(pool);
}

/**
 * Seed categories
 */
async function seedCategories(pool) {
  try {
    // Check if categories exist
    const result = await pool.query('SELECT COUNT(*) FROM categories');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      logger.info('📂 Categories already exist, skipping...');
      return;
    }
    
    logger.info('📝 Seeding categories...');
    
    const categories = [
      {
        name: 'Paintings',
        description: 'Beautiful oil and acrylic paintings showcasing Moroccan landscapes and culture',
        color: '#FF6B6B',
        sort_order: 1
      },
      {
        name: 'Sculptures',
        description: 'Three-dimensional art pieces crafted by talented Moroccan artists',
        color: '#4ECDC4',
        sort_order: 2
      },
      {
        name: 'Digital Art',
        description: 'Modern digital creations blending traditional and contemporary styles',
        color: '#45B7D1',
        sort_order: 3
      },
      {
        name: 'Photography',
        description: 'Captured moments showcasing the beauty of Morocco and its people',
        color: '#96CEB4',
        sort_order: 4
      },
      {
        name: 'Calligraphy',
        description: 'Traditional Arabic and Tifinagh calligraphy artwork',
        color: '#FFEAA7',
        sort_order: 5
      }
    ];
    
    for (const category of categories) {
      await pool.query(
        `INSERT INTO categories (name, description, color, is_active, sort_order) 
         VALUES ($1, $2, $3, $4, $5)`,
        [category.name, category.description, category.color, true, category.sort_order]
      );
    }
    
    logger.info(`✅ ${categories.length} categories seeded`);
    
  } catch (error) {
    logger.error('❌ Error seeding categories:', error);
  }
}

/**
 * Seed artworks
 */
async function seedArtworks(pool) {
  try {
    // Check if artworks exist
    const result = await pool.query('SELECT COUNT(*) FROM artworks');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      logger.info('🎨 Artworks already exist, skipping...');
      return;
    }
    
    logger.info('📝 Seeding artworks...');
    
    const artworks = [
      {
        name: 'Moroccan Sunset',
        description: 'A vibrant depiction of the Moroccan landscape at golden hour, capturing the essence of the Atlas Mountains.',
        artist: 'Ahmed El Fassi',
        price: 1200.00,
        medium: 'Oil on Canvas',
        dimensions: '80x60cm',
        year: 2023,
        status: 'AVAILABLE',
        is_featured: true,
        category_id: 1,
        image_url: 'https://images.unsplash.com/photo-1539650116574-75c0c6d3cebc?w=800'
      },
      {
        name: 'Desert Dreams',
        description: 'Abstract interpretation of the Sahara dunes, using warm earth tones and flowing forms.',
        artist: 'Fatima Zahra',
        price: 850.00,
        medium: 'Acrylic on Canvas',
        dimensions: '70x50cm',
        year: 2023,
        status: 'AVAILABLE',
        is_featured: false,
        category_id: 1,
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'
      },
      {
        name: 'Atlas Mountains',
        description: 'Majestic watercolor portrayal of Morocco\'s highest peaks, showcasing natural beauty.',
        artist: 'Mohammed Bennani',
        price: 950.00,
        medium: 'Watercolor',
        dimensions: '60x40cm',
        year: 2023,
        status: 'SOLD',
        is_featured: true,
        category_id: 1,
        image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
      },
      {
        name: 'Berber Heritage',
        description: 'Traditional carved wooden sculpture representing Berber cultural symbols.',
        artist: 'Youssef Amrani',
        price: 650.00,
        medium: 'Wood Carving',
        dimensions: '30x20x15cm',
        year: 2022,
        status: 'AVAILABLE',
        is_featured: false,
        category_id: 2,
        image_url: 'https://images.unsplash.com/photo-1594736797933-d0bb5b9fe06a?w=800'
      },
      {
        name: 'Digital Mirage',
        description: 'Contemporary digital art piece exploring the intersection of tradition and modernity.',
        artist: 'Aicha Digital',
        price: 400.00,
        medium: 'Digital Print',
        dimensions: '50x70cm',
        year: 2023,
        status: 'AVAILABLE',
        is_featured: true,
        category_id: 3,
        image_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800'
      },
      {
        name: 'Casablanca Streets',
        description: 'Street photography capturing the vibrant life around Hassan II Mosque.',
        artist: 'Omar Photographe',
        price: 300.00,
        medium: 'Photography',
        dimensions: '40x60cm',
        year: 2023,
        status: 'AVAILABLE',
        is_featured: false,
        category_id: 4,
        image_url: 'https://images.unsplash.com/photo-1539650116574-75c0c6d3cebc?w=800'
      },
      {
        name: 'Arabic Calligraphy',
        description: 'Beautiful Arabic calligraphy featuring verses from classical poetry.',
        artist: 'Hassan Kattani',
        price: 500.00,
        medium: 'Ink on Paper',
        dimensions: '50x35cm',
        year: 2023,
        status: 'AVAILABLE',
        is_featured: false,
        category_id: 5,
        image_url: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800'
      }
    ];
    
    for (const artwork of artworks) {
      await pool.query(
        `INSERT INTO artworks (name, description, artist, price, medium, dimensions, year, status, is_active, is_featured, category_id, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          artwork.name, artwork.description, artwork.artist, artwork.price,
          artwork.medium, artwork.dimensions, artwork.year, artwork.status,
          true, artwork.is_featured, artwork.category_id, artwork.image_url
        ]
      );
    }
    
    logger.info(`✅ ${artworks.length} artworks seeded`);
    
  } catch (error) {
    logger.error('❌ Error seeding artworks:', error);
  }
}

/**
 * Seed admin users
 */
async function seedAdmins(pool) {
  try {
    // Check if admins exist
    const result = await pool.query('SELECT COUNT(*) FROM admins');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      logger.info('🔐 Admins already exist, skipping...');
      return;
    }
    
    logger.info('📝 Seeding admin users...');
    
    // Hash the default password
    const hashedPassword = await bcrypt.hash('Admin123!', 12);
    
    const admins = [
      {
        username: 'admin',
        email: 'admin@elouarate.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN'
      }
    ];
    
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO admins (username, email, password_hash, first_name, last_name, is_active, role) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          admin.username, admin.email, admin.password_hash,
          admin.first_name, admin.last_name, true, admin.role
        ]
      );
    }
    
    logger.info(`✅ ${admins.length} admin users seeded`);
    logger.info('🔐 Default Admin Credentials:');
    logger.info('   📧 Email: admin@elouarate.com');
    logger.info('   🔑 Password: Admin123!');
    
  } catch (error) {
    logger.error('❌ Error seeding admins:', error);
  }
}