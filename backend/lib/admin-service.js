import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from './database.js';

/**
 * Professional Admin Service
 * Handles all admin authentication and management operations
 */
class AdminService {
  constructor() {
    this.db = new Database();
    this.jwtSecret = process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Check if any admin accounts exist
   * @returns {Promise<boolean>}
   */
  async adminExists() {
    try {
      const result = await this.db.query(
        'SELECT COUNT(*) as count FROM admins WHERE is_active = true'
      );
      return result.rows[0].count > 0;
    } catch (error) {
      console.error('❌ Error checking admin existence:', error);
      throw new Error('Database error while checking admin existence');
    }
  }

  /**
   * Authenticate admin credentials
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>}
   */
  async authenticateAdmin(email, password) {
    try {
      console.log(`🔐 Authenticating admin: ${email}`);

      // Ensure admin table exists and has default admin
      await this.ensureAdminSetup();

      // Find admin by email
      const result = await this.db.query(
        'SELECT id, username, email, password_hash, is_active, created_at FROM admins WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Admin not found: ${email}`);
        return { success: false, error: 'Invalid credentials' };
      }

      const admin = result.rows[0];

      if (!admin.is_active) {
        console.log(`❌ Admin account inactive: ${email}`);
        return { success: false, error: 'Account is inactive' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        console.log(`❌ Invalid password for admin: ${email}`);
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate tokens
      const tokens = this.generateTokens(admin);

      // Update last login
      await this.db.query(
        'UPDATE admins SET last_login = NOW() WHERE id = $1',
        [admin.id]
      );

      console.log(`✅ Admin authenticated successfully: ${email}`);

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: 'ADMIN',
          isActive: admin.is_active,
          createdAt: admin.created_at
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      console.error('❌ Admin authentication error:', error);
      throw new Error('Authentication failed due to server error');
    }
  }

  /**
   * Generate JWT tokens for admin
   * @param {Object} admin 
   * @returns {Object}
   */
  generateTokens(admin) {
    const payload = {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      type: 'admin'
    };

    const refreshPayload = {
      id: admin.id,
      type: 'admin_refresh'
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'elouarate-art-admin',
      audience: 'elouarate-art-frontend'
    });

    const refreshToken = jwt.sign(refreshPayload, this.jwtRefreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: 'elouarate-art-admin',
      audience: 'elouarate-art-frontend'
    });

    return { accessToken, refreshToken };
  }

  /**
   * Find admin by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async findAdminById(id) {
    try {
      const result = await this.db.query(
        'SELECT id, username, email, is_active, created_at FROM admins WHERE id = $1',
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error finding admin by ID:', error);
      throw new Error('Database error while finding admin');
    }
  }

  /**
   * Create new admin account
   * @param {Object} adminData 
   * @returns {Promise<Object>}
   */
  async createAdmin({ username, email, password }) {
    try {
      // Check if admin already exists
      const existingAdmin = await this.db.query(
        'SELECT id FROM admins WHERE email = $1',
        [email]
      );

      if (existingAdmin.rows.length > 0) {
        throw new Error('Admin with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new admin
      const result = await this.db.query(
        `INSERT INTO admins (username, email, password_hash, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, true, NOW(), NOW()) 
         RETURNING id, username, email, created_at`,
        [username, email, passwordHash]
      );

      console.log(`✅ Admin created successfully: ${email}`);
      return result.rows[0];

    } catch (error) {
      console.error('❌ Error creating admin:', error);
      throw error;
    }
  }

  /**
   * Ensure admin table exists and has default admin
   * @returns {Promise<void>}
   */
  async ensureAdminSetup() {
    try {
      // Create admins table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Check if default admin exists
      const defaultAdmin = await this.db.query(
        'SELECT id FROM admins WHERE email = $1',
        ['admin@elouarate.com']
      );

      if (defaultAdmin.rows.length === 0) {
        // Create default admin
        const defaultPassword = 'Admin123!';
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

        await this.db.query(
          `INSERT INTO admins (username, email, password_hash, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, true, NOW(), NOW())`,
          ['admin', 'admin@elouarate.com', passwordHash]
        );

        console.log('✅ Default admin account created: admin@elouarate.com / Admin123!');
      }

    } catch (error) {
      console.error('❌ Error ensuring admin setup:', error);
      throw new Error('Failed to setup admin system');
    }
  }

  /**
   * Change admin password
   * @param {string} adminId 
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @returns {Promise<Object>}
   */
  async changePassword(adminId, oldPassword, newPassword) {
    try {
      // Get current admin
      const admin = await this.db.query(
        'SELECT password_hash FROM admins WHERE id = $1',
        [adminId]
      );

      if (admin.rows.length === 0) {
        return { success: false, error: 'Admin not found' };
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.rows[0].password_hash);
      if (!isOldPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.db.query(
        'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, adminId]
      );

      console.log(`✅ Password changed for admin ID: ${adminId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error changing password:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Update admin profile
   * @param {string} adminId 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  async updateProfile(adminId, updateData) {
    try {
      const { username, email } = updateData;
      
      // Check if email is already taken by another admin
      if (email) {
        const existingAdmin = await this.db.query(
          'SELECT id FROM admins WHERE email = $1 AND id != $2',
          [email, adminId]
        );

        if (existingAdmin.rows.length > 0) {
          throw new Error('Email already taken by another admin');
        }
      }

      // Update admin
      const result = await this.db.query(
        `UPDATE admins 
         SET username = COALESCE($1, username), 
             email = COALESCE($2, email), 
             updated_at = NOW() 
         WHERE id = $3 
         RETURNING id, username, email, created_at`,
        [username, email, adminId]
      );

      if (result.rows.length === 0) {
        throw new Error('Admin not found');
      }

      console.log(`✅ Admin profile updated: ${adminId}`);
      return result.rows[0];

    } catch (error) {
      console.error('❌ Error updating admin profile:', error);
      throw error;
    }
  }
}

export default AdminService; 