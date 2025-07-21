/**
 * Error Service for PersonaPass Identity Wallet
 * Provides production-level error handling, logging, and recovery
 */

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  BLOCKCHAIN = 'blockchain',
  STORAGE = 'storage',
  CRYPTO = 'crypto',
  EXTERNAL_API = 'external_api',
  INTERNAL = 'internal',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: Error;
  retryable: boolean;
  recoveryActions?: string[];
  userMessage?: string;
  stack?: string;
}

export interface ErrorReport {
  id: string;
  errorInfo: ErrorInfo;
  reportedAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

export class PersonaPassError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly recoveryActions: string[];
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext,
    options: {
      retryable?: boolean;
      recoveryActions?: string[];
      userMessage?: string;
      originalError?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'PersonaPassError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.retryable = options.retryable ?? false;
    this.recoveryActions = options.recoveryActions ?? [];
    this.userMessage = options.userMessage ?? 'An unexpected error occurred';
    this.originalError = options.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PersonaPassError);
    }
  }

  toJSON(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      originalError: this.originalError,
      retryable: this.retryable,
      recoveryActions: this.recoveryActions,
      userMessage: this.userMessage,
      stack: this.stack,
    };
  }
}

export class ErrorService {
  private static instance: ErrorService;
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorListeners: ((error: ErrorInfo) => void)[] = [];

  private constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        const error = this.createError(
          'UNHANDLED_ERROR',
          event.error?.message || 'Unhandled error occurred',
          ErrorCategory.INTERNAL,
          ErrorSeverity.HIGH,
          this.createContext({ component: 'window' }),
          {
            originalError: event.error,
            userMessage: 'An unexpected error occurred. Please try again.',
          },
        );
        this.reportError(error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = this.createError(
          'UNHANDLED_PROMISE_REJECTION',
          event.reason?.message || 'Unhandled promise rejection',
          ErrorCategory.INTERNAL,
          ErrorSeverity.HIGH,
          this.createContext({ component: 'promise' }),
          {
            originalError: event.reason,
            userMessage: 'An unexpected error occurred. Please try again.',
          },
        );
        this.reportError(error);
      });
    }
  }

  /**
   * Create a new PersonaPass error
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext> = {},
    options: {
      retryable?: boolean;
      recoveryActions?: string[];
      userMessage?: string;
      originalError?: Error;
    } = {},
  ): PersonaPassError {
    const fullContext = this.createContext(context);
    return new PersonaPassError(
      code,
      message,
      category,
      severity,
      fullContext,
      options,
    );
  }

  /**
   * Create error context with defaults
   */
  createContext(context: Partial<ErrorContext> = {}): ErrorContext {
    return {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId: this.generateSessionId(),
      requestId: this.generateRequestId(),
      ...context,
    };
  }

  /**
   * Report an error
   */
  reportError(error: PersonaPassError): string {
    const reportId = this.generateReportId();
    const errorReport: ErrorReport = {
      id: reportId,
      errorInfo: error.toJSON(),
      reportedAt: Date.now(),
      resolved: false,
    };

    this.errorReports.set(reportId, errorReport);

    // Log error based on severity
    this.logErrorInternal(error);

    // Notify listeners
    this.errorListeners.forEach((listener) => {
      try {
        listener(error.toJSON());
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    return reportId;
  }

  /**
   * Log error based on severity (internal method)
   */
  private logErrorInternal(error: PersonaPassError): void {
    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
      retryable: error.retryable,
      recoveryActions: error.recoveryActions,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL] CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('[ERROR] HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WARNING] MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.log('[INFO] LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Handle OAuth2 errors
   */
  handleOAuth2Error(
    provider: string,
    error: any,
    context: Partial<ErrorContext> = {},
  ): PersonaPassError {
    let code: string;
    let message: string;
    let userMessage: string;
    let retryable = false;
    let recoveryActions: string[] = [];

    if (error.message?.includes('access_denied')) {
      code = 'OAUTH2_ACCESS_DENIED';
      message = `${provider} access denied by user`;
      userMessage = `Access to ${provider} was denied. Please try again and grant the necessary permissions.`;
      retryable = true;
      recoveryActions = ['retry_oauth_flow', 'check_permissions'];
    } else if (error.message?.includes('invalid_client')) {
      code = 'OAUTH2_INVALID_CLIENT';
      message = `Invalid ${provider} client configuration`;
      userMessage = 'Authentication configuration error. Please contact support.';
      recoveryActions = ['check_client_config', 'contact_support'];
    } else if (error.message?.includes('invalid_grant')) {
      code = 'OAUTH2_INVALID_GRANT';
      message = `${provider} authorization code expired or invalid`;
      userMessage = 'Authorization expired. Please try connecting again.';
      retryable = true;
      recoveryActions = ['retry_oauth_flow'];
    } else if (error.message?.includes('rate_limit')) {
      code = 'OAUTH2_RATE_LIMIT';
      message = `${provider} rate limit exceeded`;
      userMessage = 'Too many requests. Please wait a moment and try again.';
      retryable = true;
      recoveryActions = ['wait_and_retry', 'exponential_backoff'];
    } else {
      code = 'OAUTH2_GENERIC_ERROR';
      message = `${provider} OAuth2 error: ${error.message}`;
      userMessage = `Error connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}. Please try again.`;
      retryable = true;
      recoveryActions = ['retry_oauth_flow', 'check_network'];
    }

    return this.createError(
      code,
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      { ...context, component: `${provider}-oauth` },
      {
        retryable,
        recoveryActions,
        userMessage,
        originalError: error,
      },
    );
  }

  /**
   * Handle API errors
   */
  handleAPIError(
    service: string,
    error: any,
    context: Partial<ErrorContext> = {},
  ): PersonaPassError {
    let code: string;
    let message: string;
    let userMessage: string;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let recoveryActions: string[] = [];

    if (error.status === 401) {
      code = 'API_UNAUTHORIZED';
      message = `${service} API unauthorized`;
      userMessage = 'Authentication required. Please log in again.';
      severity = ErrorSeverity.HIGH;
      recoveryActions = ['reauthenticate', 'refresh_token'];
    } else if (error.status === 403) {
      code = 'API_FORBIDDEN';
      message = `${service} API forbidden`;
      userMessage = 'Access denied. Please check your permissions.';
      severity = ErrorSeverity.HIGH;
      recoveryActions = ['check_permissions', 'contact_support'];
    } else if (error.status === 404) {
      code = 'API_NOT_FOUND';
      message = `${service} API resource not found`;
      userMessage = 'Resource not found. Please check your request.';
      recoveryActions = ['check_request', 'verify_resource'];
    } else if (error.status === 429) {
      code = 'API_RATE_LIMIT';
      message = `${service} API rate limit exceeded`;
      userMessage = 'Rate limit exceeded. Please wait and try again.';
      retryable = true;
      recoveryActions = ['wait_and_retry', 'exponential_backoff'];
    } else if (error.status >= 500) {
      code = 'API_SERVER_ERROR';
      message = `${service} API server error`;
      userMessage = 'Server error. Please try again later.';
      severity = ErrorSeverity.HIGH;
      retryable = true;
      recoveryActions = ['retry_later', 'check_status_page'];
    } else if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
      code = 'API_TIMEOUT';
      message = `${service} API timeout`;
      userMessage = 'Request timed out. Please try again.';
      retryable = true;
      recoveryActions = ['retry_request', 'check_network'];
    } else {
      code = 'API_GENERIC_ERROR';
      message = `${service} API error: ${error.message}`;
      userMessage = 'Service temporarily unavailable. Please try again.';
      retryable = true;
      recoveryActions = ['retry_request', 'check_network'];
    }

    return this.createError(
      code,
      message,
      ErrorCategory.EXTERNAL_API,
      severity,
      { ...context, component: `${service}-api` },
      {
        retryable,
        recoveryActions,
        userMessage,
        originalError: error,
      },
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    field: string,
    value: any,
    rule: string,
    context: Partial<ErrorContext> = {},
  ): PersonaPassError {
    const code = 'VALIDATION_ERROR';
    const message = `Validation failed for field '${field}' with rule '${rule}'`;
    const userMessage = `Invalid ${field}. Please check your input and try again.`;

    return this.createError(
      code,
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { ...context, metadata: { field, value, rule } },
      {
        retryable: false,
        recoveryActions: ['fix_input', 'check_requirements'],
        userMessage,
      },
    );
  }

  /**
   * Handle blockchain errors
   */
  handleBlockchainError(
    operation: string,
    error: any,
    context: Partial<ErrorContext> = {},
  ): PersonaPassError {
    let code: string;
    let message: string;
    let userMessage: string;
    let severity = ErrorSeverity.HIGH;
    let retryable = false;
    let recoveryActions: string[] = [];

    if (error.message?.includes('insufficient funds')) {
      code = 'BLOCKCHAIN_INSUFFICIENT_FUNDS';
      message = `Insufficient funds for ${operation}`;
      userMessage = 'Insufficient funds to complete the transaction.';
      recoveryActions = ['add_funds', 'check_balance'];
    } else if (error.message?.includes('gas')) {
      code = 'BLOCKCHAIN_GAS_ERROR';
      message = `Gas error during ${operation}`;
      userMessage = 'Transaction failed due to gas issues. Please try again.';
      retryable = true;
      recoveryActions = ['adjust_gas', 'retry_transaction'];
    } else if (error.message?.includes('nonce')) {
      code = 'BLOCKCHAIN_NONCE_ERROR';
      message = `Nonce error during ${operation}`;
      userMessage = 'Transaction ordering issue. Please try again.';
      retryable = true;
      recoveryActions = ['retry_transaction', 'refresh_nonce'];
    } else if (error.message?.includes('network')) {
      code = 'BLOCKCHAIN_NETWORK_ERROR';
      message = `Network error during ${operation}`;
      userMessage = 'Blockchain network error. Please try again.';
      retryable = true;
      recoveryActions = ['retry_transaction', 'check_network'];
    } else {
      code = 'BLOCKCHAIN_GENERIC_ERROR';
      message = `Blockchain error during ${operation}: ${error.message}`;
      userMessage = 'Blockchain operation failed. Please try again.';
      retryable = true;
      recoveryActions = ['retry_transaction', 'check_network'];
    }

    return this.createError(
      code,
      message,
      ErrorCategory.BLOCKCHAIN,
      severity,
      { ...context, component: 'blockchain', action: operation },
      {
        retryable,
        recoveryActions,
        userMessage,
        originalError: error,
      },
    );
  }

  /**
   * Public method for logging errors from components
   */
  logError(message: string, error?: any): void {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: ErrorInfo) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: ErrorInfo) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Get error report by ID
   */
  getErrorReport(reportId: string): ErrorReport | undefined {
    return this.errorReports.get(reportId);
  }

  /**
   * Get all error reports
   */
  getAllErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  /**
   * Mark error as resolved
   */
  resolveError(reportId: string, resolution: string): void {
    const report = this.errorReports.get(reportId);
    if (report) {
      report.resolved = true;
      report.resolvedAt = Date.now();
      report.resolution = resolution;
    }
  }

  /**
   * Clear old error reports
   */
  clearOldReports(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expiredReports: string[] = [];

    for (const [id, report] of this.errorReports.entries()) {
      if (now - report.reportedAt > maxAge) {
        expiredReports.push(id);
      }
    }

    expiredReports.forEach((id) => this.errorReports.delete(id));

    if (expiredReports.length > 0) {
      console.log(`[CLEANUP] Cleared ${expiredReports.length} old error reports`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return 'report_' + Math.random().toString(36).substr(2, 9);
  }
}

export const errorService = ErrorService.getInstance();

/**
 * Error handling decorator
 */
export function handleErrors(
  errorCategory: ErrorCategory,
  errorSeverity: ErrorSeverity = ErrorSeverity.MEDIUM,
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const personaError = errorService.createError(
          `${propertyKey.toUpperCase()}_ERROR`,
          error instanceof Error ? error.message : 'Unknown error',
          errorCategory,
          errorSeverity,
          errorService.createContext({
            component: target.constructor.name,
            action: propertyKey,
          }),
          {
            originalError: error instanceof Error ? error : undefined,
            retryable: true,
          },
        );

        errorService.reportError(personaError);
        throw personaError;
      }
    };

    return descriptor;
  };
}