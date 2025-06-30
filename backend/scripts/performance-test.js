#!/usr/bin/env node

/**
 * Performance testing script for Elouarate Art API
 */

import http from 'http';
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:3001/api';

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const end = performance.now();
        resolve({
          path,
          status: res.statusCode,
          time: Math.round(end - start),
          size: body.length
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runPerformanceTests() {
  console.log('🚀 Running Performance Tests');
  console.log('═'.repeat(50));
  
  const tests = [
    { path: '/health', name: 'Health Check' },
    { path: '/stats', name: 'System Stats' },
    { path: '/categories', name: 'Categories List' },
    { path: '/artworks', name: 'Artworks List' },
    { path: '/artworks?limit=5', name: 'Artworks (Limited)' },
  ];

  for (const test of tests) {
    try {
      const result = await testEndpoint(test.path);
      const status = result.status === 200 ? '✅' : '❌';
      console.log(`${status} ${test.name.padEnd(20)} | ${result.time}ms | ${result.status}`);
    } catch (error) {
      console.log(`❌ ${test.name.padEnd(20)} | ERROR | ${error.message}`);
    }
  }
  
  console.log('\n📈 Performance test completed');
}

runPerformanceTests().catch(console.error);