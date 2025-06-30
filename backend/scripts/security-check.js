#!/usr/bin/env node

/**
 * Security check script for Elouarate Art API
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

function checkEnvironmentSecurity() {
  console.log('🔒 Checking Environment Security');
  console.log('═'.repeat(40));
  
  const envFile = '.env';
  if (!existsSync(envFile)) {
    console.log('❌ .env file not found');
    return;
  }
  
  const envContent = readFileSync(envFile, 'utf8');
  
  // Check for default/weak secrets
  const securityChecks = [
    {
      pattern: /JWT_SECRET=.*development.*|JWT_SECRET=.*test.*|JWT_SECRET=.*123.*/,
      message: 'Weak JWT secret detected',
      severity: 'HIGH'
    },
    {
      pattern: /DATABASE_URL=.*localhost.*:.*@/,
      message: 'Database credentials in development mode',
      severity: 'MEDIUM'
    },
    {
      pattern: /NODE_ENV=production/,
      message: 'Production environment detected',
      severity: 'INFO'
    }
  ];
  
  securityChecks.forEach(check => {
    if (check.pattern.test(envContent)) {
      const icon = check.severity === 'HIGH' ? '🚨' : 
                   check.severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${check.severity}] ${check.message}`);
    }
  });
}

function checkDependencyVulnerabilities() {
  console.log('\n🛡️ Checking Dependencies');
  console.log('═'.repeat(40));
  
  try {
    execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
    console.log('✅ No critical vulnerabilities found');
  } catch (error) {
    console.log('⚠️ Vulnerabilities detected - run: npm audit fix');
  }
}

function main() {
  console.log('🔐 ELOUARATE ART - Security Check');
  console.log('═'.repeat(50));
  
  checkEnvironmentSecurity();
  checkDependencyVulnerabilities();
  
  console.log('\n✅ Security check completed');
}

main();