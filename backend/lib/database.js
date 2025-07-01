import pkg from 'pg';
const { Pool } = pkg;

/**
 * Professional Database Service
 * Handles PostgreSQL connections with proper error handling and connection pooling
 */
class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.init();
  }

  /**
   * Initialize database connection pool
   */
  init() {
    try {
      // Database configuration with fallback values
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'elouarate_art',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        
        // Connection pool settings
        min: 2,
        max: 20,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        
        // SSL configuration
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };

      this.pool = new Pool(config);

      // Handle pool events
      this.pool.on('connect', (client) => {
        console.log('📦 New database client connected');
      });

      this.pool.on('error', (err) => {
        console.error('🚨 Database pool error:', err);
        this.isConnected = false;
      });

      this.pool.on('remove', (client) => {
        console.log('📤 Database client removed from pool');
      });

      console.log('✅ Database pool initialized');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error('Failed to initialize database connection');
    }
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as timestamp, version() as version');
      client.release();
      
      this.isConnected = true;
      console.log('✅ Database connection test successful');
      console.log(`📊 PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      console.log(`⏰ Server Time: ${result.rows[0].timestamp}`);
      
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection test failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>}
   */
  async query(text, params = []) {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(text, params);
        const duration = Date.now() - startTime;
        
        // Log slow queries (> 1000ms)
        if (duration > 1000) {
          console.warn(`⚠️  Slow query detected (${duration}ms):`, text.substring(0, 100));
        }
        
        console.log(`📊 Query executed in ${duration}ms - Rows: ${result.rowCount}`);
        return result;
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Query failed after ${duration}ms:`, error.message);
      console.error(`🔍 Query: ${text}`);
      console.error(`🔍 Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<any>}
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed');
      
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔙 Transaction rolled back:', error.message);
      throw error;
      
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in sequence
   * @param {Array} queries - Array of {text, params} objects
   * @returns {Promise<Array>}
   */
  async batchQuery(queries) {
    return this.transaction(async (client) => {
      const results = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params || []);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Check if connection is healthy
   * @returns {boolean}
   */
  isHealthy() {
    return this.isConnected && this.pool && !this.pool.ended;
  }

  /**
   * Get connection pool stats
   * @returns {Object}
   */
  getStats() {
    if (!this.pool) {
      return { error: 'Pool not initialized' };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isHealthy: this.isHealthy(),
      isConnected: this.isConnected
    };
  }

  /**
   * Close all connections
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('✅ Database pool closed');
      }
    } catch (error) {
      console.error('❌ Error closing database pool:', error);
    }
  }

  /**
   * Create database tables if they don't exist
   * @returns {Promise<void>}
   */
  async initializeTables() {
    try {
      console.log('🔧 Initializing database tables...');

      // Create tables in the correct order (considering foreign key dependencies)
      const tableCreationQueries = [
        // Categories table
        `CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          color VARCHAR(7) DEFAULT '#6366f1',
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        // Artworks table
        `CREATE TABLE IF NOT EXISTS artworks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          original_price DECIMAL(10,2),
          medium VARCHAR(255),
          dimensions VARCHAR(255),
          year INTEGER,
          status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
          is_active BOOLEAN DEFAULT true,
          is_featured BOOLEAN DEFAULT false,
          view_count INTEGER DEFAULT 0,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        // Artwork images table
        `CREATE TABLE IF NOT EXISTS artwork_images (
          id SERIAL PRIMARY KEY,
          artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255),
          mime_type VARCHAR(100),
          size INTEGER,
          url TEXT NOT NULL,
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        // Users table
        `CREATE TABLE IF NOT EXISTS users (
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
        )`,

        // Customers table (for guest orders)
        `CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          address TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        // Orders table
        `CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES customers(id),
          user_id INTEGER REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
          total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          shipping_amount DECIMAL(10,2) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          payment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
          payment_method VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        // Order items table
        `CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          artwork_id INTEGER REFERENCES artworks(id),
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        // Inquiries table
        `CREATE TABLE IF NOT EXISTS inquiries (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          subject VARCHAR(500),
          message TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'NEW' CHECK (status IN ('NEW', 'READ', 'REPLIED', 'CLOSED')),
          artwork_id INTEGER REFERENCES artworks(id),
          admin_reply TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        // Create indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status)`,
        `CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks(is_featured)`,
        `CREATE INDEX IF NOT EXISTS idx_artwork_images_artwork ON artwork_images(artwork_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
        `CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`
      ];

      // Execute table creation queries
      for (const query of tableCreationQueries) {
        await this.query(query);
      }

      console.log('✅ Database tables initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw new Error(`Failed to initialize database tables: ${error.message}`);
    }
  }
}

export default Database; 