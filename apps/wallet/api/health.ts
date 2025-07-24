import { VercelRequest, VercelResponse } from '@vercel/node';

// BigInt serialization fix
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  metadata?: any;
  error?: string;
}

async function checkExternalService(name: string, url: string, timeout: number = 5000): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PersonaPass-Health-Check/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      service: name,
      status: response.ok ? 'healthy' : 'degraded',
      responseTime,
      metadata: {
        statusCode: response.status,
        statusText: response.statusText
      }
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      service: name,
      status: 'unhealthy',
      responseTime,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

async function checkEnvironmentVariables(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'PLAID_CLIENT_ID',
    'PLAID_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const responseTime = Date.now() - startTime;
  
  return {
    service: 'environment',
    status: missing.length === 0 ? 'healthy' : 'degraded',
    responseTime,
    metadata: {
      totalVariables: requiredEnvVars.length,
      configured: requiredEnvVars.length - missing.length,
      missing: missing.length > 0 ? missing : undefined
    },
    error: missing.length > 0 ? `Missing environment variables: ${missing.join(', ')}` : undefined
  };
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const memoryUsage = process.memoryUsage();
    const responseTime = Date.now() - startTime;
    
    // Convert bytes to MB
    const memoryData = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    // Flag as degraded if heap usage is over 80% of total
    const heapUsagePercent = (memoryData.heapUsed / memoryData.heapTotal) * 100;
    const status = heapUsagePercent > 80 ? 'degraded' : 'healthy';
    
    return {
      service: 'memory',
      status,
      responseTime,
      metadata: {
        ...memoryData,
        heapUsagePercent: Math.round(heapUsagePercent)
      }
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'memory',
      status: 'unhealthy',
      responseTime,
      error: error.message
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    console.log('Health check requested');
    
    // Run all health checks in parallel
    const [envCheck, memoryCheck, githubCheck, plaidCheck] = await Promise.all([
      checkEnvironmentVariables(),
      checkMemoryUsage(),
      checkExternalService('github', 'https://api.github.com'),
      checkExternalService('plaid', 'https://api.plaid.com')
    ]);
    
    const checks = [envCheck, memoryCheck, githubCheck, plaidCheck];
    const totalResponseTime = Date.now() - startTime;
    
    // Determine overall health status
    const healthyServices = checks.filter(check => check.status === 'healthy').length;
    const degradedServices = checks.filter(check => check.status === 'degraded').length;
    const unhealthyServices = checks.filter(check => check.status === 'unhealthy').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: totalResponseTime,
      services: {
        healthy: healthyServices,
        degraded: degradedServices,
        unhealthy: unhealthyServices,
        total: checks.length
      },
      checks: checks.reduce((acc, check) => {
        acc[check.service] = {
          status: check.status,
          responseTime: check.responseTime,
          metadata: check.metadata,
          error: check.error
        };
        return acc;
      }, {} as Record<string, any>),
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        vercelRegion: process.env.VERCEL_REGION,
        vercelUrl: process.env.VERCEL_URL
      }
    };
    
    console.log('Health check completed:', {
      status: overallStatus,
      responseTime: `${totalResponseTime}ms`,
      healthyServices,
      degradedServices,
      unhealthyServices
    });
    
    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    // For HEAD requests, only return headers
    if (req.method === 'HEAD') {
      res.status(httpStatus).end();
      return;
    }
    
    res.status(httpStatus).json(healthData);
    
  } catch (error: any) {
    console.error('Health check error:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(errorResponse);
  }
}