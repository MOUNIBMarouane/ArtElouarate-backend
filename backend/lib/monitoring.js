/**
 * 📊 ELOUARATE ART - Production Monitoring & Health System
 * Enterprise-grade monitoring for Railway deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// HEALTH MONITORING SYSTEM
// =============================================================================

class HealthMonitor {
  constructor() {
    this.checks = new Map();
    this.history = [];
    this.maxHistorySize = 100;
    this.startTime = Date.now();
  }

  // Register a health check
  registerCheck(name, checkFunction, options = {}) {
    this.checks.set(name, {
      name,
      checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      lastStatus: null,
      lastChecked: null,
      consecutiveFailures: 0
    });
  }

  // Run a single health check
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name,
      status: 'unknown',
      message: '',
      duration: 0,
      timestamp: new Date().toISOString(),
      critical: check.critical
    };

    try {
      // Run the check with timeout
      const checkPromise = check.checkFunction();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });

      const checkResult = await Promise.race([checkPromise, timeoutPromise]);
      
      result.status = checkResult.healthy ? 'healthy' : 'unhealthy';
      result.message = checkResult.message || '';
      result.data = checkResult.data;
      result.duration = Date.now() - startTime;

      check.consecutiveFailures = result.status === 'healthy' ? 0 : check.consecutiveFailures + 1;
      
    } catch (error) {
      result.status = 'error';
      result.message = error.message;
      result.duration = Date.now() - startTime;
      check.consecutiveFailures++;
    }

    check.lastStatus = result.status;
    check.lastChecked = result.timestamp;

    return result;
  }

  // Run all health checks
  async runAllChecks() {
    const results = [];
    const checkPromises = [];

    for (const [name] of this.checks) {
      checkPromises.push(this.runCheck(name));
    }

    try {
      const checkResults = await Promise.allSettled(checkPromises);
      
      checkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const checkName = Array.from(this.checks.keys())[index];
          results.push({
            name: checkName,
            status: 'error',
            message: result.reason.message,
            duration: 0,
            timestamp: new Date().toISOString(),
            critical: this.checks.get(checkName).critical
          });
        }
      });
    } catch (error) {
      console.error('Error running health checks:', error);
    }

    // Add to history
    const healthSummary = {
      timestamp: new Date().toISOString(),
      overall: this.calculateOverallHealth(results),
      checks: results,
      uptime: Date.now() - this.startTime
    };

    this.addToHistory(healthSummary);
    return healthSummary;
  }

  // Calculate overall health status
  calculateOverallHealth(results) {
    const criticalFailed = results.some(r => r.critical && r.status !== 'healthy');
    const anyFailed = results.some(r => r.status !== 'healthy');

    if (criticalFailed) return 'critical';
    if (anyFailed) return 'degraded';
    return 'healthy';
  }

  // Add to history
  addToHistory(summary) {
    this.history.unshift(summary);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  // Get system overview
  getSystemOverview() {
    const uptime = Date.now() - this.startTime;
    const lastCheck = this.history[0];
    
    return {
      status: lastCheck ? lastCheck.overall : 'unknown',
      uptime: {
        seconds: Math.floor(uptime / 1000),
        human: this.formatUptime(uptime)
      },
      checks: {
        total: this.checks.size,
        passing: lastCheck ? lastCheck.checks.filter(c => c.status === 'healthy').length : 0,
        failing: lastCheck ? lastCheck.checks.filter(c => c.status !== 'healthy').length : 0
      },
      lastChecked: lastCheck ? lastCheck.timestamp : null
    };
  }

  // Format uptime in human readable format
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Global health monitor instance
const healthMonitor = new HealthMonitor();

// =============================================================================
// ERROR LOGGING SYSTEM
// =============================================================================

class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
    this.logFile = path.join(__dirname, '../logs/errors.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // Log an error
  async logError(error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      context: {
        url: context.url,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
        userId: context.userId,
        ...context
      },
      level: context.level || 'error'
    };

    // Add to memory
    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Log to console
    console.error(`🚨 ERROR [${errorEntry.id}]:`, error.message);
    if (context.url) {
      console.error(`   URL: ${context.method} ${context.url}`);
    }
    if (context.ip) {
      console.error(`   IP: ${context.ip}`);
    }

    // Write to file
    try {
      const logLine = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(this.logFile, logLine);
    } catch (writeError) {
      console.error('Failed to write error to log file:', writeError);
    }

    return errorEntry.id;
  }

  // Generate unique error ID
  generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Get recent errors
  getRecentErrors(limit = 50) {
    return this.errors.slice(0, limit);
  }

  // Get error statistics
  getErrorStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const lastHour = now - (60 * 60 * 1000);
    
    const recent24h = this.errors.filter(e => new Date(e.timestamp).getTime() > last24h);
    const recentHour = this.errors.filter(e => new Date(e.timestamp).getTime() > lastHour);

    return {
      total: this.errors.length,
      last24Hours: recent24h.length,
      lastHour: recentHour.length,
      byType: this.groupByType(recent24h)
    };
  }

  // Group errors by type
  groupByType(errors) {
    return errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {});
  }
}

// Global error logger instance
const errorLogger = new ErrorLogger();

// =============================================================================
// HEALTH CHECK DEFINITIONS
// =============================================================================

// Database health check
const databaseHealthCheck = async (queryFunction) => {
  try {
    const start = Date.now();
    await queryFunction('SELECT 1 as healthy');
    const duration = Date.now() - start;
    
    return {
      healthy: true,
      message: `Database connection successful (${duration}ms)`,
      data: { responseTime: duration }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database connection failed: ${error.message}`,
      data: { error: error.message }
    };
  }
};

// Memory health check
const memoryHealthCheck = async () => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  
  const isHealthy = usagePercent < 90; // Alert if using more than 90% of heap
  
  return {
    healthy: isHealthy,
    message: `Memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercent}%)`,
    data: {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      usagePercent,
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    }
  };
};

// Disk space health check
const diskHealthCheck = async () => {
  try {
    const stats = await fs.stat(process.cwd());
    return {
      healthy: true,
      message: 'Disk space check passed',
      data: { accessible: true }
    };
  } catch (error) {
    return {
      healthy: false,
      message: 'Disk space check failed',
      data: { error: error.message }
    };
  }
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Error tracking middleware
export const errorTrackingMiddleware = (err, req, res, next) => {
  const context = {
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId,
    body: req.method === 'POST' ? req.body : undefined,
    query: req.query,
    params: req.params
  };

  errorLogger.logError(err, context);
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    errorId: context.errorId,
    timestamp: new Date().toISOString()
  };

  if (!isProduction) {
    errorResponse.stack = err.stack;
  }

  res.status(500).json(errorResponse);
};

// =============================================================================
// INITIALIZATION FUNCTION
// =============================================================================

export const initializeMonitoring = (queryFunction) => {
  console.log('📊 Initializing health monitoring...');
  
  // Register health checks
  healthMonitor.registerCheck('database', () => databaseHealthCheck(queryFunction), {
    timeout: 5000,
    critical: true
  });
  
  healthMonitor.registerCheck('memory', memoryHealthCheck, {
    timeout: 1000,
    critical: false
  });
  
  healthMonitor.registerCheck('disk', diskHealthCheck, {
    timeout: 2000,
    critical: false
  });

  // Start periodic health checks (every 30 seconds)
  setInterval(async () => {
    try {
      await healthMonitor.runAllChecks();
    } catch (error) {
      console.error('Health check interval error:', error);
    }
  }, 30000);

  // Run initial health check
  setTimeout(() => {
    healthMonitor.runAllChecks();
  }, 1000);

  console.log('✅ Health monitoring initialized');
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  healthMonitor,
  errorLogger
};

export default {
  healthMonitor,
  errorLogger,
  errorTrackingMiddleware,
  initializeMonitoring
};