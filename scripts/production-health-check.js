#!/usr/bin/env node

/**
 * Production Health Check Script
 * Monitors PersonaPass production deployment health
 * NO HARDCODED VALUES - CONFIGURABLE HEALTH MONITORING
 */

import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Health check configuration
const HEALTH_CONFIG = {
  timeout: 10000, // 10 seconds
  retries: 3,
  interval: 30000, // 30 seconds
  logFile: path.join(__dirname, '../logs/health-check.log'),
  alertThreshold: 5 // consecutive failures before alert
};

// Health check results
const healthResults = {
  timestamp: new Date().toISOString(),
  overall: 'unknown',
  checks: [],
  alerts: [],
  metrics: {
    responseTime: 0,
    uptime: 0,
    memory: 0,
    cpu: 0
  }
};

// Health check endpoints
const HEALTH_ENDPOINTS = {
  app: process.env.VITE_APP_URL || 'http://localhost:5173',
  api: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
  blockchain: process.env.VITE_PERSONA_RPC_URL || 'https://rpc.personachain.com',
  relayer: process.env.VITE_IBC_RELAYER_URL || 'https://relayer.personachain.com'
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  const logMessage = `${timestamp} ${emoji} ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  if (!fs.existsSync(path.dirname(HEALTH_CONFIG.logFile))) {
    fs.mkdirSync(path.dirname(HEALTH_CONFIG.logFile), { recursive: true });
  }
  fs.appendFileSync(HEALTH_CONFIG.logFile, logMessage + '\n');
}

function addHealthCheck(name, status, details, responseTime = 0) {
  healthResults.checks.push({
    name,
    status,
    details,
    responseTime,
    timestamp: new Date().toISOString()
  });
  
  log(`${name}: ${status}${details ? ` - ${details}` : ''}${responseTime ? ` (${responseTime}ms)` : ''}`, 
      status === 'healthy' ? 'success' : status === 'unhealthy' ? 'error' : 'warning');
}

/**
 * Check application health
 */
async function checkApplicationHealth() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${HEALTH_ENDPOINTS.app}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_CONFIG.timeout)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const health = await response.json();
      addHealthCheck('Application', 'healthy', `Status: ${health.status}`, responseTime);
      return true;
    } else {
      addHealthCheck('Application', 'unhealthy', `HTTP ${response.status}: ${response.statusText}`, responseTime);
      return false;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addHealthCheck('Application', 'unhealthy', error.message, responseTime);
    return false;
  }
}

/**
 * Check API health
 */
async function checkAPIHealth() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${HEALTH_ENDPOINTS.api}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_CONFIG.timeout)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const health = await response.json();
      addHealthCheck('API', 'healthy', `Status: ${health.status}`, responseTime);
      return true;
    } else {
      addHealthCheck('API', 'unhealthy', `HTTP ${response.status}: ${response.statusText}`, responseTime);
      return false;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addHealthCheck('API', 'unhealthy', error.message, responseTime);
    return false;
  }
}

/**
 * Check blockchain health
 */
async function checkBlockchainHealth() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${HEALTH_ENDPOINTS.blockchain}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_CONFIG.timeout)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const health = await response.json();
      addHealthCheck('Blockchain', 'healthy', `Chain: ${health.chain_id}`, responseTime);
      return true;
    } else {
      addHealthCheck('Blockchain', 'unhealthy', `HTTP ${response.status}: ${response.statusText}`, responseTime);
      return false;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addHealthCheck('Blockchain', 'unhealthy', error.message, responseTime);
    return false;
  }
}

/**
 * Check IBC relayer health
 */
async function checkRelayerHealth() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${HEALTH_ENDPOINTS.relayer}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_CONFIG.timeout)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const health = await response.json();
      addHealthCheck('IBC Relayer', 'healthy', `Status: ${health.status}`, responseTime);
      return true;
    } else {
      addHealthCheck('IBC Relayer', 'unhealthy', `HTTP ${response.status}: ${response.statusText}`, responseTime);
      return false;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addHealthCheck('IBC Relayer', 'unhealthy', error.message, responseTime);
    return false;
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    // Check if database files exist and are accessible
    const dbPath = path.join(__dirname, '../data/personapass.db');
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      const size = (stats.size / 1024 / 1024).toFixed(2); // MB
      addHealthCheck('Database', 'healthy', `Size: ${size}MB`);
      return true;
    } else {
      addHealthCheck('Database', 'unhealthy', 'Database file not found');
      return false;
    }
  } catch (error) {
    addHealthCheck('Database', 'unhealthy', error.message);
    return false;
  }
}

/**
 * Check circuit files health
 */
async function checkCircuitHealth() {
  try {
    const circuitsDir = path.join(__dirname, '../dist/circuits');
    const registryPath = path.join(circuitsDir, 'circuit-registry.json');
    
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const circuitCount = registry.circuits.length;
      addHealthCheck('ZK Circuits', 'healthy', `${circuitCount} circuits available`);
      return true;
    } else {
      addHealthCheck('ZK Circuits', 'unhealthy', 'Circuit registry not found');
      return false;
    }
  } catch (error) {
    addHealthCheck('ZK Circuits', 'unhealthy', error.message);
    return false;
  }
}

/**
 * Check environment configuration
 */
async function checkEnvironmentHealth() {
  try {
    const requiredVars = [
      'VITE_BLOCKCHAIN_NETWORK',
      'VITE_PERSONA_RPC_URL',
      'VITE_ENCRYPTION_KEY',
      'VITE_JWT_SECRET'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length === 0) {
      addHealthCheck('Environment', 'healthy', 'All required variables set');
      return true;
    } else {
      addHealthCheck('Environment', 'unhealthy', `Missing: ${missing.join(', ')}`);
      return false;
    }
  } catch (error) {
    addHealthCheck('Environment', 'unhealthy', error.message);
    return false;
  }
}

/**
 * Calculate overall health
 */
function calculateOverallHealth() {
  const totalChecks = healthResults.checks.length;
  const healthyChecks = healthResults.checks.filter(check => check.status === 'healthy').length;
  const unhealthyChecks = healthResults.checks.filter(check => check.status === 'unhealthy').length;
  
  const healthPercentage = (healthyChecks / totalChecks) * 100;
  
  if (healthPercentage === 100) {
    healthResults.overall = 'healthy';
  } else if (healthPercentage >= 80) {
    healthResults.overall = 'warning';
  } else {
    healthResults.overall = 'unhealthy';
  }
  
  // Calculate metrics
  const responseTimes = healthResults.checks
    .filter(check => check.responseTime > 0)
    .map(check => check.responseTime);
  
  if (responseTimes.length > 0) {
    healthResults.metrics.responseTime = Math.round(
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    );
  }
  
  return {
    overall: healthResults.overall,
    healthy: healthyChecks,
    unhealthy: unhealthyChecks,
    total: totalChecks,
    percentage: Math.round(healthPercentage)
  };
}

/**
 * Generate health report
 */
function generateHealthReport() {
  const summary = calculateOverallHealth();
  
  console.log('\n' + '='.repeat(80));
  console.log('                     PRODUCTION HEALTH CHECK REPORT');
  console.log('='.repeat(80));
  
  const overallEmoji = summary.overall === 'healthy' ? '✅' : summary.overall === 'warning' ? '⚠️' : '❌';
  console.log(`\n${overallEmoji} OVERALL HEALTH: ${summary.overall.toUpperCase()} (${summary.percentage}%)`);
  console.log(`   • Healthy: ${summary.healthy}/${summary.total} checks`);
  console.log(`   • Unhealthy: ${summary.unhealthy}/${summary.total} checks`);
  console.log(`   • Average Response Time: ${healthResults.metrics.responseTime}ms`);
  console.log(`   • Timestamp: ${healthResults.timestamp}`);
  
  console.log(`\n📋 DETAILED HEALTH CHECKS:`);
  healthResults.checks.forEach(check => {
    const emoji = check.status === 'healthy' ? '✅' : check.status === 'unhealthy' ? '❌' : '⚠️';
    const responseTime = check.responseTime > 0 ? ` (${check.responseTime}ms)` : '';
    console.log(`   ${emoji} ${check.name}: ${check.status}${check.details ? ` - ${check.details}` : ''}${responseTime}`);
  });
  
  if (healthResults.alerts.length > 0) {
    console.log(`\n🚨 ALERTS:`);
    healthResults.alerts.forEach(alert => {
      console.log(`   • ${alert}`);
    });
  }
  
  console.log(`\n📊 ENDPOINTS:`);
  Object.entries(HEALTH_ENDPOINTS).forEach(([name, url]) => {
    console.log(`   • ${name}: ${url}`);
  });
  
  console.log(`\n📄 LOG FILE: ${HEALTH_CONFIG.logFile}`);
  console.log('='.repeat(80));
  
  // Save health report
  const reportPath = path.join(__dirname, '../logs', `health-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(healthResults, null, 2));
  
  return summary.overall === 'healthy';
}

/**
 * Main health check function
 */
async function main() {
  console.log('🩺 Starting Production Health Check...');
  console.log('Monitoring PersonaPass production deployment health\n');
  
  try {
    // Run all health checks
    const checks = [
      checkApplicationHealth,
      checkAPIHealth,
      checkBlockchainHealth,
      checkRelayerHealth,
      checkDatabaseHealth,
      checkCircuitHealth,
      checkEnvironmentHealth
    ];
    
    for (const check of checks) {
      await check();
    }
    
    // Generate report
    const isHealthy = generateHealthReport();
    process.exit(isHealthy ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, healthResults };