import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Generate XML sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://elouarateart.com';
    
    // Get all active artworks
    const artworksResult = await pool.query(`
      SELECT a.id, a.name, a.description, a."updatedAt", 
             c.name as category_name
      FROM artworks a
      LEFT JOIN categories c ON a."categoryId" = c.id
      WHERE a."isActive" = true AND a.status = 'AVAILABLE'
      ORDER BY a."updatedAt" DESC
    `);
    const artworks = artworksResult.rows;

    // Get all active categories
    const categoriesResult = await pool.query(`
      SELECT id, name, "updatedAt"
      FROM categories
      WHERE "isActive" = true
      ORDER BY name ASC
    `);
    const categories = categoriesResult.rows;

    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/artwork', priority: '0.9', changefreq: 'daily' },
      { url: '/ma3rid', priority: '0.8', changefreq: 'weekly' },
      { url: '/artist-showcase', priority: '0.7', changefreq: 'weekly' }
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of staticPages) {
      const lastmod = new Date().toISOString().split('T')[0];
      sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add category pages
    for (const category of categories) {
      const lastmod = new Date(category.updatedAt).toISOString().split('T')[0];
      const categoryUrl = `/category/${encodeURIComponent(category.name.toLowerCase().replace(/\s+/g, '-'))}`;
      
      sitemap += `  <url>
    <loc>${baseUrl}${categoryUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add artwork pages
    for (const artwork of artworks) {
      const lastmod = new Date(artwork.updatedAt).toISOString().split('T')[0];
      const artworkUrl = `/artwork/${artwork.id}`;
      
      sitemap += `  <url>
    <loc>${baseUrl}${artworkUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    sitemap += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://elouarateart.com';
  
  const robots = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /login/
Disallow: /register/

# Allow important directories
Allow: /uploads/
Allow: /images/
Allow: /artwork/
Allow: /category/
`;

  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

export default router; 