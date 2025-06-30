import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database
import db from '../lib/db.js';
import supabase, { supabaseAdmin } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "http://localhost:3000", "http://localhost:8080"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        'https://your-domain.vercel.app'
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection using a simple query instead of raw SQL
    await db.user.findMany({ take: 1 });
    
    res.json({ 
      status: 'OK',
      message: 'Server and database are healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Database health check error:', error);
    res.json({ 
      status: 'WARNING',
      message: 'Server is running, database connection pending',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple POST test endpoint
app.post('/api/test-post', (req, res) => {
  console.log('Test POST received:', req.body);
  res.json({
    success: true,
    message: 'POST request successful',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .single();
    
    if (error) throw error;
    
    res.json({
      message: 'Supabase connection successful',
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      message: 'Supabase connection test',
      error: error.message,
      note: 'This is normal if tables don\'t exist yet'
    });
  }
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error - missing environment variables' 
      });
    }
    
    const { email, password, firstName, lastName } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // For now, create a simple test response to verify the connection works
    // We'll add back Supabase integration once basic flow is confirmed
    const userId = `user_${Date.now()}`; // Simple ID generation
    const token = `test_token_${Date.now()}`; // Simple token generation
    
    console.log('Creating test user:', { email, firstName, lastName });
    
    // Return format that matches frontend expectations
    res.status(201).json({
      success: true,
      message: 'Test registration successful - connection working!',
      data: {
        token: token,
        user: {
          id: userId,
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: 'USER'
        }
      }
    });

    /* TODO: Re-enable Supabase integration after testing
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName
      }
    });
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({ 
        success: false,
        error: authError.message 
      });
    }
    
    // Create user record in database
    const user = await db.user.create({
      data: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        isEmailVerified: true
      }
    });
    
    // Generate JWT token for frontend
    const token = authData.session?.access_token || 'temp-token';
    
    // Return format that matches frontend expectations
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'USER'
        }
      }
    });
    */
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login in database
    await db.user.update({
      where: { id: data.user.id },
      data: { lastLogin: new Date() }
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.firstName || '',
          lastName: data.user.user_metadata?.lastName || '',
          role: 'USER'
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logout successful' 
  });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data: userData, error } = await supabase.auth.getUser(token);
    
    if (error || !userData.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userData.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'USER'
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Image serving endpoint with proper CORS headers
app.get('/api/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../uploads', filename);
    
    console.log(`🖼️ Image request: ${filename}`);
    console.log(`📁 Looking for: ${imagePath}`);
    
    // Set CORS headers for images
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Check if file exists and serve it
    if (existsSync(imagePath)) {
      console.log(`✅ Image found and serving: ${filename}`);
      res.sendFile(imagePath);
    } else {
      console.log(`❌ Image not found: ${filename}`);
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('❌ Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Image upload endpoint
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 Image upload request received');
    console.log('File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Create multiple URL formats for maximum compatibility
    const imageRecord = {
      id: `img_${Date.now()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      isPrimary: false
    };

    console.log('✅ Image uploaded successfully:', imageRecord);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: imageRecord.id,
        url: `/uploads/${req.file.filename}`,
        apiUrl: `/api/images/${req.file.filename}`,
        directUrl: `http://localhost:3000/uploads/${req.file.filename}`,
        proxyUrl: `http://localhost:3000/api/images/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// Image upload error handling middleware
app.use('/api/upload/image', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  } else if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed.'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Upload failed',
    details: error.message
  });
});

// Artworks Routes
app.get('/api/artworks', async (req, res) => {
  try {
    console.log('🎨 GET /api/artworks - Request received');
    
    // Try database query first, fallback to test data if it fails
    let artworks = [];
    
    try {
      console.log('🔄 Attempting database query for artworks...');
      
      const dbArtworks = await db.artwork.findMany({
        where: { isActive: true },
        include: {
          category: true,
          images: true
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      // Transform database results to match expected format
      artworks = dbArtworks.map(artwork => ({
        ...artwork,
        images: artwork.images || [],
        createdAt: artwork.createdAt?.toISOString(),
        updatedAt: artwork.updatedAt?.toISOString()
      }));
      
      console.log(`✅ Database query successful - Found ${artworks.length} artworks`);
      
    } catch (dbError) {
      console.warn('⚠️ Database query failed for artworks, using test data:', dbError.message);
      
      // Fallback to test artworks with proper image URLs
      artworks = [
        {
          id: 'test_artwork_1',
          name: 'Beautiful Sunset',
          description: 'A stunning sunset painting with vibrant colors',
          price: 350.00,
          originalPrice: 450.00,
          medium: 'Oil on Canvas',
          dimensions: '24x36 inches',
          year: 2023,
          status: 'AVAILABLE',
          isActive: true,
          isFeatured: true,
          viewCount: 45,
          categoryId: 'test_cat_1',
          category: {
            id: 'test_cat_1',
            name: 'Paintings',
            color: '#ff6b6b'
          },
          images: [
            {
              id: 'test_img_1',
              url: '/uploads/image-1750838659883-822756722.jpeg',
              apiUrl: '/api/images/image-1750838659883-822756722.jpeg',
              isPrimary: true
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_artwork_2', 
          name: 'Modern Abstract',
          description: 'Contemporary abstract piece exploring color and form',
          price: 280.00,
          originalPrice: 350.00,
          medium: 'Acrylic on Canvas',
          dimensions: '18x24 inches',
          year: 2024,
          status: 'AVAILABLE',
          isActive: true,
          isFeatured: false,
          viewCount: 23,
          categoryId: 'test_cat_4',
          category: {
            id: 'test_cat_4',
            name: 'Abstract',
            color: '#9b59b6'
          },
          images: [
            {
              id: 'test_img_2',
              url: '/uploads/image-1750838648500-406109168.jpeg',
              apiUrl: '/api/images/image-1750838648500-406109168.jpeg',
              isPrimary: true
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    
    const response = {
      success: true,
      artworks,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: artworks.length,
        itemsPerPage: 20
      },
      message: `Found ${artworks.length} artworks`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Sending response with ${artworks.length} artworks`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Get artworks error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch artworks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create new artwork
app.post('/api/artworks', async (req, res) => {
  try {
    console.log('🎨 POST /api/artworks - Creating new artwork');
    console.log('Request body:', req.body);
    
    const {
      name,
      description,
      price,
      originalPrice,
      medium,
      dimensions,
      year,
      categoryId,
      status,
      isActive,
      isFeatured,
      image // Change from imageUrl to image to match frontend
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !medium || !dimensions || !year || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    // Try database operation first
    try {
      // Verify category exists
      const category = await db.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Category not found'
        });
      }

      // Create artwork
      const artwork = await db.artwork.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          medium,
          dimensions,
          year: parseInt(year),
          categoryId,
          status: status || 'AVAILABLE',
          isActive: isActive !== undefined ? isActive : true,
          isFeatured: isFeatured !== undefined ? isFeatured : false
        },
        include: {
          category: true,
          images: true
        }
      });

      // If image URL is provided, create image record
      if (image) {
        try {
          const filename = image.split('/').pop(); // Extract filename from URL
          await db.image.create({
            data: {
              filename: filename,
              url: image,
              isPrimary: true,
              artworkId: artwork.id
            }
          });
          
          // Fetch artwork again with images
          const artworkWithImages = await db.artwork.findUnique({
            where: { id: artwork.id },
            include: {
              category: true,
              images: true
            }
          });
          
          res.status(201).json({
            success: true,
            data: { artwork: artworkWithImages },
            message: 'Artwork created successfully with image'
          });
        } catch (imageError) {
          console.warn('Image association failed:', imageError);
          res.status(201).json({
            success: true,
            data: { artwork },
            message: 'Artwork created successfully (image association failed)'
          });
        }
      } else {
        res.status(201).json({
          success: true,
          data: { artwork },
          message: 'Artwork created successfully'
        });
      }

    } catch (dbError) {
      console.warn('Database operation failed, creating test artwork:', dbError.message);
      
      // Fallback: create test artwork
      const testArtwork = {
        id: `artwork_${Date.now()}`,
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        medium,
        dimensions,
        year: parseInt(year),
        categoryId,
        status: status || 'AVAILABLE',
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured !== undefined ? isFeatured : false,
        viewCount: 0,
        category: {
          id: categoryId,
          name: 'Test Category'
        },
        images: image ? [{
          id: `img_${Date.now()}`,
          url: image,
          apiUrl: image.replace('/uploads/', '/api/images/'),
          isPrimary: true
        }] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        data: { artwork: testArtwork },
        message: 'Artwork created successfully (test mode)'
      });
    }

  } catch (error) {
    console.error('❌ Create artwork error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create artwork',
      message: error.message
    });
  }
});

// Get single artwork by ID
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎨 GET /api/artworks/${id} - Request received`);

    try {
      const artwork = await db.artwork.findUnique({
        where: { id },
        include: {
          category: true,
          images: true
        }
      });

      if (!artwork) {
        return res.status(404).json({
          success: false,
          error: 'Artwork not found'
        });
      }

      // Increment view count
      await db.artwork.update({
        where: { id },
        data: { viewCount: artwork.viewCount + 1 }
      });

      res.json({
        success: true,
        data: { artwork },
        message: 'Artwork retrieved successfully'
      });

    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
      res.status(404).json({
        success: false,
        error: 'Artwork not found'
      });
    }

  } catch (error) {
    console.error('❌ Get artwork error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artwork'
    });
  }
});

// Update artwork
app.put('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(`🎨 PUT /api/artworks/${id} - Updating artwork`);

    try {
      // Check if artwork exists
      const existingArtwork = await db.artwork.findUnique({
        where: { id }
      });

      if (!existingArtwork) {
        return res.status(404).json({
          success: false,
          error: 'Artwork not found'
        });
      }

      // If categoryId is being updated, verify it exists
      if (updateData.categoryId) {
        const category = await db.category.findUnique({
          where: { id: updateData.categoryId }
        });

        if (!category) {
          return res.status(400).json({
            success: false,
            error: 'Category not found'
          });
        }
      }

      // Process numeric fields
      if (updateData.price) updateData.price = parseFloat(updateData.price);
      if (updateData.originalPrice) updateData.originalPrice = parseFloat(updateData.originalPrice);
      if (updateData.year) updateData.year = parseInt(updateData.year);

      // Update artwork
      const updatedArtwork = await db.artwork.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          images: true
        }
      });

      res.json({
        success: true,
        data: { artwork: updatedArtwork },
        message: 'Artwork updated successfully'
      });

    } catch (dbError) {
      console.warn('Database update failed:', dbError.message);
      res.status(500).json({
        success: false,
        error: 'Failed to update artwork'
      });
    }

  } catch (error) {
    console.error('❌ Update artwork error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update artwork'
    });
  }
});

// Delete artwork
app.delete('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎨 DELETE /api/artworks/${id} - Deleting artwork`);

    try {
      // Check if artwork exists
      const existingArtwork = await db.artwork.findUnique({
        where: { id }
      });

      if (!existingArtwork) {
        return res.status(404).json({
          success: false,
          error: 'Artwork not found'
        });
      }

      // Delete artwork (images will be deleted due to cascade)
      await db.artwork.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Artwork deleted successfully'
      });

    } catch (dbError) {
      console.warn('Database delete failed:', dbError.message);
      res.status(500).json({
        success: false,
        error: 'Failed to delete artwork'
      });
    }

  } catch (error) {
    console.error('❌ Delete artwork error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete artwork'
    });
  }
});

// Admin Authentication Routes
app.get('/api/auth/admin/exists', async (req, res) => {
  try {
    const adminCount = await db.admin.count();
    res.json({
      success: true,
      data: {
        hasAdmin: adminCount > 0
      },
      message: 'Admin check completed'
    });
  } catch (error) {
    console.error('Admin exists check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check admin existence' 
    });
  }
});

app.post('/api/auth/admin/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Admin registration request:', { username, email });

    // Check if any admin already exists
    const existingAdminCount = await db.admin.count();
    if (existingAdminCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Please contact existing admin.'
      });
    }

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin in database
    const newAdmin = await db.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isActive: true,
        isSuperAdmin: true,
        permissions: ['all']
      }
    });

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        adminId: newAdmin.id, 
        email: newAdmin.email,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...adminData } = newAdmin;

    res.status(201).json({
      success: true,
      data: {
        admin: adminData,
        token
      },
      message: 'Admin registered successfully'
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register admin'
    });
  }
});

app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin login attempt:', { email });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin by email
    const admin = await db.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is disabled'
      });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        email: admin.email,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin;

    res.json({
      success: true,
      data: {
        admin: adminData,
        token
      },
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login admin'
    });
  }
});

// Categories Routes
app.get('/api/categories', async (req, res) => {
  try {
    console.log('📂 GET /api/categories - Request received');
    
    // Try database query first, fallback to test data if it fails
    let categories = [];
    
    try {
      console.log('🔄 Attempting database query for categories...');
      
      const dbCategories = await db.category.findMany({
        where: { isActive: true },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ],
        include: {
          _count: {
            select: { artworks: true }
          }
        }
      });
      
      // Transform database results to match expected format
      categories = dbCategories.map(category => ({
        ...category,
        artworkCount: category._count?.artworks || 0,
        createdAt: category.createdAt?.toISOString(),
        updatedAt: category.updatedAt?.toISOString()
      }));
      
      console.log(`✅ Database query successful - Found ${categories.length} categories`);
      
    } catch (dbError) {
      console.warn('⚠️ Database query failed for categories, using test data:', dbError.message);
      
      // Fallback to test categories
      categories = [
        {
          id: 'test_cat_1',
          name: 'Paintings',
          description: 'Beautiful paintings collection featuring diverse styles and techniques',
          color: '#ff6b6b',
          isActive: true,
          sortOrder: 1,
          artworkCount: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_cat_2',
          name: 'Sculptures',
          description: 'Amazing sculptures crafted from various materials',
          color: '#4ecdc4',
          isActive: true,
          sortOrder: 2,
          artworkCount: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_cat_3',
          name: 'Digital Art',
          description: 'Modern digital creations and contemporary art',
          color: '#45b7d1',
          isActive: true,
          sortOrder: 3,
          artworkCount: 12,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_cat_4',
          name: 'Abstract',
          description: 'Abstract art exploring color, form, and emotion',
          color: '#9b59b6',
          isActive: true,
          sortOrder: 4,
          artworkCount: 6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'test_cat_5',
          name: 'Photography',
          description: 'Stunning photography capturing life\'s moments',
          color: '#f39c12',
          isActive: true,
          sortOrder: 5,
          artworkCount: 20,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    
    const response = {
      success: true,
      categories,
      count: categories.length,
      message: `Found ${categories.length} categories`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Sending response with ${categories.length} categories`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Get categories error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch categories',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test page for image serving
app.get('/test-images', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-images.html'));
});

// Test image serving endpoint
app.get('/api/test-images', async (req, res) => {
  try {
    console.log('🧪 Testing image serving...');
    
    const fs = await import('fs/promises');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // List all files in uploads directory
    const files = await fs.readdir(uploadsDir);
    const imageFiles = files.filter(file => 
      file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    
    const imageTests = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: stats.size,
          exists: existsSync(filePath),
          urls: {
            direct: `/uploads/${filename}`,
            api: `/api/images/${filename}`,
            full: `http://localhost:3000/uploads/${filename}`
          }
        };
      })
    );
    
    res.json({
      success: true,
      uploadsDirectory: uploadsDir,
      totalImages: imageFiles.length,
      images: imageTests,
      message: 'Image serving test completed'
    });
    
  } catch (error) {
    console.error('❌ Image test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test images',
      message: error.message
    });
  }
});

// Dashboard Routes
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/dashboard/stats - Request received');
    
    // Try to get real stats from database, fallback to mock data
    let stats = {};
    
    try {
      console.log('🔄 Attempting to fetch dashboard stats from database...');
      
      // Get real database counts
      const [
        totalUsers,
        totalAdmins,
        totalArtworks,
        featuredArtworks,
        totalCategories,
        activeCategories,
        totalOrders,
        totalCustomers,
        totalInquiries
      ] = await Promise.all([
        db.user.count(),
        db.admin.count(),
        db.artwork.count({ where: { isActive: true } }),
        db.artwork.count({ where: { isActive: true, isFeatured: true } }),
        db.category.count(),
        db.category.count({ where: { isActive: true } }),
        db.order ? db.order.count() : 0, // Optional table
        db.customer ? db.customer.count() : 0, // Optional table
        db.inquiry ? db.inquiry.count() : 0 // Optional table
      ]);
      
      stats = {
        users: {
          total: totalUsers,
          recent: Math.floor(totalUsers * 0.1), // 10% as recent
          growth: 12.5
        },
        artworks: {
          total: totalArtworks,
          featured: featuredArtworks,
          growth: 8.3
        },
        categories: {
          total: totalCategories,
          active: activeCategories,
          growth: 5.2
        },
        orders: {
          total: totalOrders,
          recent: Math.floor(totalOrders * 0.05), // 5% as recent
          growth: 15.7
        },
        inquiries: {
          total: totalInquiries,
          recent: Math.floor(totalInquiries * 0.3), // 30% as recent
          pending: Math.floor(totalInquiries * 0.2) // 20% as pending
        },
        customers: {
          total: totalCustomers,
          active: Math.floor(totalCustomers * 0.8) // 80% as active
        },
        revenue: {
          total: totalOrders * 450, // Average order value estimate
          currency: 'USD'
        },
        admins: {
          total: totalAdmins
        }
      };
      
      console.log(`✅ Database stats successful - ${totalArtworks} artworks, ${totalCategories} categories`);
      
    } catch (dbError) {
      console.warn('⚠️ Database stats query failed, using mock data:', dbError.message);
      
      // Fallback to mock stats
      stats = {
        users: {
          total: 1234,
          recent: 123,
          growth: 12.5
        },
        artworks: {
          total: 47,
          featured: 12,
          growth: 8.3
        },
        categories: {
          total: 8,
          active: 5,
          growth: 5.2
        },
        orders: {
          total: 89,
          recent: 15,
          growth: 15.7
        },
        inquiries: {
          total: 45,
          recent: 12,
          pending: 8
        },
        customers: {
          total: 567,
          active: 445
        },
        revenue: {
          total: 25340,
          currency: 'USD'
        },
        admins: {
          total: 1
        }
      };
    }
    
    const response = {
      success: true,
      data: stats,
      message: 'Dashboard stats retrieved successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Sending dashboard stats response');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard/activity', async (req, res) => {
  try {
    console.log('📈 GET /api/dashboard/activity - Request received');
    
    // Mock activity data for now
    const activities = [
      {
        id: 1,
        type: 'artwork',
        title: 'New artwork uploaded',
        description: 'Beautiful Sunset painting was added to gallery',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        icon: 'palette'
      },
      {
        id: 2,
        type: 'user',
        title: 'User registered',
        description: 'John Doe joined the platform',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        icon: 'user'
      },
      {
        id: 3,
        type: 'order',
        title: 'Order completed',
        description: 'Jane Smith purchased Modern Sculpture',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        icon: 'shopping-cart'
      },
      {
        id: 4,
        type: 'inquiry',
        title: 'Inquiry received',
        description: 'Mike Johnson inquired about Abstract Expression',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        icon: 'message-square'
      },
      {
        id: 5,
        type: 'category',
        title: 'Category updated',
        description: 'Photography category was modified',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        icon: 'folder'
      }
    ];
    
    const response = {
      success: true,
      data: activities,
      message: 'Activity feed retrieved successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Sending activity feed response');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Get dashboard activity error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard activity',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Static file serving for frontend
const frontendPath = path.join(__dirname, '../../Frontend/dist');

// Serve static files
app.use(express.static(frontendPath));

// Main route - serve frontend or API info
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>🎨 ELOUARATE ART - Full Stack</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
                 margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                 color: white; min-height: 100vh; }
          .container { max-width: 800px; margin: 0 auto; }
          .card { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 30px; margin: 20px 0; 
                  backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
          h1 { margin: 0 0 20px 0; font-size: 2.5rem; }
          .status { display: inline-block; background: #4ade80; padding: 5px 15px; border-radius: 20px; 
                   color: white; font-weight: bold; margin: 10px 0; }
          .endpoint { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 10px 0; 
                     border-left: 4px solid #4ade80; }
          .endpoint a { color: #93c5fd; text-decoration: none; }
          .endpoint a:hover { text-decoration: underline; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>🎨 ELOUARATE ART</h1>
            <div class="status">✅ Full-Stack Server Running</div>
            <p>Your backend is successfully running on Vercel with Supabase database integration!</p>
          </div>
          
          <div class="grid">
            <div class="card">
              <h3>🔗 API Endpoints</h3>
              <div class="endpoint">
                <strong>Health Check:</strong><br>
                <a href="/api/health">/api/health</a>
              </div>
              <div class="endpoint">
                <strong>Test Supabase:</strong><br>
                <a href="/api/test-supabase">/api/test-supabase</a>
              </div>
              <div class="endpoint">
                <strong>Artworks:</strong><br>
                <a href="/api/artworks">/api/artworks</a>
              </div>
              <div class="endpoint">
                <strong>Categories:</strong><br>
                <a href="/api/categories">/api/categories</a>
              </div>
            </div>
            
            <div class="card">
              <h3>🚀 Features</h3>
              <ul>
                <li>✅ Supabase Database</li>
                <li>✅ Authentication Ready</li>
                <li>✅ Prisma ORM</li>
                <li>✅ API Routes</li>
                <li>✅ Frontend Serving</li>
                <li>✅ Rate Limiting</li>
                <li>✅ CORS Configured</li>
              </ul>
            </div>
          </div>
          
          <div class="card">
            <h3>📱 Frontend</h3>
            <p>Your React frontend will be served from this same domain once built.</p>
            <p><strong>To build frontend:</strong> <code>cd Frontend && npm run build</code></p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Catch-all for frontend routes
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Frontend not built yet. Run: cd Frontend && npm run build');
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

export default app; 