/**
 * Production Security Headers Configuration
 * Implements comprehensive security headers for production deployment
 */

export interface SecurityConfig {
  contentSecurityPolicy: {
    directives: Record<string, string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  headers: Record<string, string>;
  enforceHttps: boolean;
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
}

export const productionSecurityConfig: SecurityConfig = {
  enforceHttps: true,
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for WASM and some crypto libraries
        'https://js.stripe.com',
        'https://api.stripe.com',
        'blob:', // For worker scripts
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind and styled components
        'https://fonts.googleapis.com',
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:', // For generated QR codes and images
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
      ],
      'connect-src': [
        "'self'",
        'http://localhost:8080', // Backend API
        'https://personachain-prod.uc.r.appspot.com',
        'wss://personachain-prod.uc.r.appspot.com',
        'https://api.stripe.com',
        'https://*.vercel.app', // Vercel deployments
        'https://*.netlify.app', // Netlify deployments
      ],
      'worker-src': [
        "'self'",
        'blob:', // For web workers
      ],
      'child-src': [
        "'self'",
        'https://js.stripe.com',
        'https://*.stripe.com',
      ],
      'frame-src': [
        "'self'",
        'https://js.stripe.com',
        'https://*.stripe.com',
      ],
      'frame-ancestors': ["'none'"], // Prevent clickjacking
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'upgrade-insecure-requests': [], // Force HTTPS
    },
    reportOnly: false,
  },
  headers: {
    // Security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(),',
      'payment=(self), usb=(), serial=(), bluetooth=(), midi=()',
    ].join(' '),
    
    // Performance headers
    'X-DNS-Prefetch-Control': 'on',
    'X-Permitted-Cross-Domain-Policies': 'none',
    
    // Custom headers
    'X-Powered-By': 'PersonaPass Identity Wallet',
    'X-App-Version': process.env.REACT_APP_VERSION || '1.0.0',
  },
};

export const developmentSecurityConfig: SecurityConfig = {
  ...productionSecurityConfig,
  enforceHttps: false,
  contentSecurityPolicy: {
    ...productionSecurityConfig.contentSecurityPolicy,
    directives: {
      ...productionSecurityConfig.contentSecurityPolicy.directives,
      'connect-src': [
        ...productionSecurityConfig.contentSecurityPolicy.directives['connect-src'],
        'ws://localhost:*', // Vite HMR
        'http://localhost:*', // Local development
      ],
    },
    reportOnly: true, // Don't enforce in development
  },
};

/**
 * Generate CSP header string from directives
 */
export function generateCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Apply security headers to a Response object
 */
export function applySecurityHeaders(
  response: Response,
  config: SecurityConfig = productionSecurityConfig
): Response {
  const headers = new Headers(response.headers);

  // Apply CSP header
  const cspHeader = generateCSPHeader(config.contentSecurityPolicy.directives);
  const cspHeaderName = config.contentSecurityPolicy.reportOnly 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';
  headers.set(cspHeaderName, cspHeader);

  // Apply HSTS header
  if (config.hsts.enabled) {
    let hstsValue = `max-age=${config.hsts.maxAge}`;
    if (config.hsts.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    if (config.hsts.preload) {
      hstsValue += '; preload';
    }
    headers.set('Strict-Transport-Security', hstsValue);
  }

  // Apply other security headers
  Object.entries(config.headers).forEach(([name, value]) => {
    headers.set(name, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Client-side security validation
 */
export class ClientSecurityValidator {
  private static instance: ClientSecurityValidator;

  private constructor() {
    this.initializeSecurityChecks();
  }

  static getInstance(): ClientSecurityValidator {
    if (!ClientSecurityValidator.instance) {
      ClientSecurityValidator.instance = new ClientSecurityValidator();
    }
    return ClientSecurityValidator.instance;
  }

  private initializeSecurityChecks(): void {
    // Check for HTTPS in production
    if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
      console.warn('🚨 Security Warning: Application should be served over HTTPS in production');
    }

    // Check for security headers
    this.validateSecurityHeaders();

    // Monitor for mixed content
    this.setupMixedContentDetection();

    // Setup CSP violation reporting
    this.setupCSPReporting();
  }

  private validateSecurityHeaders(): void {
    // This would typically be done server-side, but we can check some client-side indicators
    const securityChecks = [
      {
        name: 'HTTPS',
        check: () => location.protocol === 'https:' || location.hostname === 'localhost',
        message: 'Application should be served over HTTPS'
      },
      {
        name: 'Secure Context',
        check: () => window.isSecureContext,
        message: 'Application should run in a secure context'
      },
      {
        name: 'Storage Security',
        check: () => {
          try {
            return !!window.crypto && !!window.crypto.subtle;
          } catch {
            return false;
          }
        },
        message: 'Web Crypto API should be available for secure operations'
      }
    ];

    securityChecks.forEach(({ name, check, message }) => {
      if (!check()) {
        console.warn(`🚨 Security Check Failed [${name}]: ${message}`);
      }
    });
  }

  private setupMixedContentDetection(): void {
    // Monitor for mixed content warnings
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
      const message = args.join(' ');
      if (message.includes('Mixed Content') || message.includes('mixed content')) {
        console.error('🚨 Mixed Content Detected:', message);
      }
      originalConsoleWarn.apply(console, args);
    };
  }

  private setupCSPReporting(): void {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error('🚨 CSP Violation:', {
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
      });

      // In production, this would be sent to a logging service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to logging service
        // fetch('/api/csp-report', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     directive: event.violatedDirective,
        //     blockedURI: event.blockedURI,
        //     sourceFile: event.sourceFile,
        //     lineNumber: event.lineNumber,
        //     columnNumber: event.columnNumber,
        //     timestamp: Date.now(),
        //   })
        // }).catch(console.error);
      }
    });
  }

  /**
   * Validate that sensitive operations are performed securely
   */
  validateSecureOperation(operationName: string): boolean {
    const checks = [
      {
        name: 'Secure Context',
        valid: window.isSecureContext,
        message: 'Operation requires secure context (HTTPS)',
      },
      {
        name: 'Web Crypto Available',
        valid: !!window.crypto?.subtle,
        message: 'Operation requires Web Crypto API',
      },
      {
        name: 'Storage Available',
        valid: (() => {
          try {
            localStorage.setItem('security-test', 'test');
            localStorage.removeItem('security-test');
            return true;
          } catch {
            return false;
          }
        })(),
        message: 'Operation requires secure storage access',
      },
    ];

    const failures = checks.filter(check => !check.valid);
    
    if (failures.length > 0) {
      console.error(`🚨 Security validation failed for operation "${operationName}":`, 
        failures.map(f => f.message));
      return false;
    }

    return true;
  }

  /**
   * Generate a security report
   */
  generateSecurityReport(): {
    secureContext: boolean;
    protocol: string;
    cryptoAvailable: boolean;
    storageAvailable: boolean;
    timestamp: number;
    userAgent: string;
  } {
    return {
      secureContext: window.isSecureContext,
      protocol: location.protocol,
      cryptoAvailable: !!window.crypto?.subtle,
      storageAvailable: (() => {
        try {
          localStorage.setItem('security-test', 'test');
          localStorage.removeItem('security-test');
          return true;
        } catch {
          return false;
        }
      })(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };
  }
}

// Initialize client-side security validator
export const clientSecurityValidator = ClientSecurityValidator.getInstance();

// Export security configurations based on environment
export const securityConfig = process.env.NODE_ENV === 'production' 
  ? productionSecurityConfig 
  : developmentSecurityConfig;