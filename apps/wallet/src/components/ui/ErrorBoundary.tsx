/**
 * Enhanced Error Boundary with Analytics & Recovery
 * Sprint 1.4: Production-grade error handling with user-friendly recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { analyticsService } from '../../services/analyticsService';
import { errorService } from "@/services/errorService";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRecovering: boolean;
  recoveryMode: 'reload' | 'reset' | 'fallback' | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  componentName?: string;
  level?: 'page' | 'component' | 'widget';
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  retryCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    componentName?: string;
    level: string;
    props?: any;
    state?: any;
    route?: string;
  };
}

const ERROR_TYPES = {
  NETWORK: 'Network Error',
  VALIDATION: 'Validation Error',
  PERMISSION: 'Permission Error',
  AUTHENTICATION: 'Authentication Error',
  WALLET: 'Wallet Error',
  CRYPTO: 'Cryptography Error',
  UNKNOWN: 'Unknown Error',
};

const RECOVERY_STRATEGIES = {
  reload: {
    label: 'Reload Page',
    description: 'Refresh the entire page',
    icon: '[RELOAD]',
    action: () => window.location.reload(),
  },
  reset: {
    label: 'Reset Component',
    description: 'Clear state and try again',
    icon: '[RESET]',
    action: () => {}, // Handled by component
  },
  fallback: {
    label: 'Safe Mode',
    description: 'Load basic functionality only',
    icon: '[SAFE]',
    action: () => {}, // Handled by component
  },
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryMode: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> | null {
    // AGGRESSIVE: Suppress ALL browser extension and known problematic errors
    const shouldSuppress = 
      // Browser extension errors
      error.stack?.includes('chrome-extension://') ||
      error.stack?.includes('moz-extension://') ||
      error.stack?.includes('content_script') ||
      error.stack?.includes('injected-script') ||
      error.stack?.includes('hook.js') ||
      error.stack?.includes('overrideMethod') ||
      
      // Specific error messages that are always from extensions
      error.message?.includes('Invalid or unexpected token') ||
      error.message?.includes('Node cannot be found') ||
      error.message?.includes('extension') ||
      error.message?.includes('contentScripts') ||
      error.message?.includes('injectedScript') ||
      
      // Any error without proper stack trace (often corrupted by extensions)
      !error.stack ||
      error.stack.length < 10;

    if (shouldSuppress) {
      // Completely silent suppression - no logging at all
      return null;
    }

    // Only log and handle legitimate application errors
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this error was already suppressed in getDerivedStateFromError
    // If the component doesn't have hasError: true, then it was suppressed
    if (!this.state.hasError) {
      // Error was suppressed in getDerivedStateFromError, nothing to do here
      console.log('[SHIELD] Extension error suppressed, continuing normal render');
      return;
    }

    // This is a legitimate error that wasn't suppressed, handle it normally
    errorService.logError('[ALERT] ComponentDidCatch: Processing legitimate application error:', {
      message: error.message,
      componentName: this.props.componentName,
      level: this.props.level
    });

    this.setState({ errorInfo });

    const errorReport = this.createErrorReport(error, errorInfo);
    
    // Report error asynchronously to avoid blocking
    setTimeout(() => {
      this.reportError(errorReport);
    }, 0);

    // Call custom error handler
    try {
      this.props.onError?.(error, errorInfo);
    } catch (handlerError) {
      errorService.logError('Error handler failed:', handlerError);
    }

    // Auto-recovery for certain error types
    if (this.props.enableRecovery && this.shouldAutoRecover(error)) {
      this.scheduleAutoRecovery();
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private createErrorReport(error: Error, errorInfo: ErrorInfo): ErrorReport {
    return {
      errorId: this.state.errorId!,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.state.retryCount,
      severity: this.determineErrorSeverity(error),
      context: {
        componentName: this.props.componentName,
        level: this.props.level || 'component',
        route: window.location.pathname,
      },
    };
  }

  private async reportError(report: ErrorReport) {
    try {
      // Report to analytics service (non-blocking)
      setTimeout(async () => {
        try {
          await analyticsService.trackEvent(
            'error',
            'error_boundary',
            'catch',
            undefined,
            {
              errorId: report.errorId,
              errorType: this.categorizeError(report.message),
              severity: report.severity,
              componentName: report.context.componentName,
              level: report.context.level,
              retryCount: report.retryCount,
              stack: report.stack?.substring(0, 500), // Truncate for analytics
            }
          );
        } catch (analyticsError) {
          console.warn('Analytics error in error boundary:', analyticsError);
        }
      }, 0);

      // Store detailed error report
      const existingReports = this.getStoredErrorReports();
      existingReports.push(report);
      
      // Keep only last 50 error reports
      if (existingReports.length > 50) {
        existingReports.splice(0, existingReports.length - 50);
      }
      
      localStorage.setItem('persona_error_reports', JSON.stringify(existingReports));

      errorService.logError('Error Boundary caught error:', {
        errorId: report.errorId,
        message: report.message,
        severity: report.severity,
        context: report.context,
      });

    } catch (reportingError) {
      errorService.logError('Failed to report error:', reportingError);
    }
  }

  private getStoredErrorReports(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('persona_error_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private categorizeError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return ERROR_TYPES.NETWORK;
    }
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return ERROR_TYPES.VALIDATION;
    }
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return ERROR_TYPES.PERMISSION;
    }
    if (lowerMessage.includes('authentication') || lowerMessage.includes('auth')) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    if (lowerMessage.includes('wallet') || lowerMessage.includes('keplr')) {
      return ERROR_TYPES.WALLET;
    }
    if (lowerMessage.includes('crypto') || lowerMessage.includes('proof')) {
      return ERROR_TYPES.CRYPTO;
    }
    
    return ERROR_TYPES.UNKNOWN;
  }

  private determineErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const errorType = this.categorizeError(error.message);
    const level = this.props.level || 'component';
    
    // Critical errors that affect the entire page
    if (level === 'page' || errorType === ERROR_TYPES.AUTHENTICATION) {
      return 'critical';
    }
    
    // High severity for wallet and crypto errors
    if (errorType === ERROR_TYPES.WALLET || errorType === ERROR_TYPES.CRYPTO) {
      return 'high';
    }
    
    // Medium for network and validation errors
    if (errorType === ERROR_TYPES.NETWORK || errorType === ERROR_TYPES.VALIDATION) {
      return 'medium';
    }
    
    return 'low';
  }

  private shouldAutoRecover(error: Error): boolean {
    const errorType = this.categorizeError(error.message);
    const maxRetries = this.props.maxRetries || 3;
    
    // Don't auto-recover if we've exceeded max retries
    if (this.state.retryCount >= maxRetries) {
      return false;
    }
    
    // Auto-recover for network errors and some validation errors
    return errorType === ERROR_TYPES.NETWORK || errorType === ERROR_TYPES.VALIDATION;
  }

  private scheduleAutoRecovery() {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    const timeout = setTimeout(() => {
      this.handleRetry('reset');
    }, delay);
    
    this.retryTimeouts.push(timeout);
  }

  private handleRetry = async (mode: 'reload' | 'reset' | 'fallback') => {
    this.setState({ 
      isRecovering: true, 
      recoveryMode: mode,
      retryCount: this.state.retryCount + 1,
    });

    try {
      // Track recovery attempt
      await analyticsService.trackEvent(
        'user_action',
        'error_recovery',
        'attempt',
        undefined,
        {
          errorId: this.state.errorId,
          recoveryMode: mode,
          retryCount: this.state.retryCount + 1,
        }
      );

      if (mode === 'reload') {
        RECOVERY_STRATEGIES.reload.action();
        return;
      }

      if (mode === 'reset') {
        // Reset component state - with protection against infinite loops
        setTimeout(() => {
          // Only reset if we haven't exceeded max retries to prevent infinite loops
          if (this.state.retryCount < (this.props.maxRetries || 3)) {
            this.setState({
              hasError: false,
              error: null,
              errorInfo: null,
              isRecovering: false,
              recoveryMode: null,
            });
          } else {
            // Max retries reached, switch to fallback mode instead
            this.setState({
              isRecovering: false,
              recoveryMode: 'fallback',
            });
          }
        }, 1000);
        return;
      }

      if (mode === 'fallback') {
        // Switch to fallback mode
        this.setState({ 
          isRecovering: false,
          recoveryMode: 'fallback',
        });
        return;
      }

    } catch (recoveryError) {
      errorService.logError('Recovery failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  };

  private handleFeedback = () => {
    // Open feedback system for error reporting
    analyticsService.trackEvent(
      'user_action',
      'error_feedback',
      'open',
      undefined,
      { errorId: this.state.errorId }
    );
  };

  private renderErrorDetails() {
    if (!this.state.error) return null;

    const errorType = this.categorizeError(this.state.error.message);
    const isDevMode = process.env.NODE_ENV === 'development';

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Error Details</span>
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
            {errorType}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>Error ID:</strong> {this.state.errorId}</div>
          <div><strong>Message:</strong> {this.state.error.message}</div>
          <div><strong>Retry Count:</strong> {this.state.retryCount}</div>
          
          {isDevMode && this.state.error.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-500">
                Stack Trace (Dev Only)
              </summary>
              <pre className="mt-1 text-xs bg-gray-800 text-green-400 p-2 rounded overflow-auto max-h-32">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  private renderFallbackContent() {
    const { fallback } = this.props;
    
    if (fallback) {
      return fallback;
    }

    return (
      <div className="min-h-32 flex items-center justify-center p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl mb-2">[SAFE]</div>
          <div className="text-sm text-gray-600">
            Running in safe mode
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // If we have an error state, we should display the error UI
      // (Extension errors should have been filtered out in getDerivedStateFromError)
      
      if (this.state.recoveryMode === 'fallback') {
        return this.renderFallbackContent();
      }

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-64 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-6">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">[ERROR]</div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600">
                We encountered an unexpected error. Don't worry, we're tracking this issue.
              </p>
            </div>

            {/* Recovery Options */}
            {this.props.enableRecovery && !this.state.isRecovering && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Try these solutions:
                </h3>
                
                {Object.entries(RECOVERY_STRATEGIES).map(([mode, strategy]) => (
                  <button
                    key={mode}
                    onClick={() => this.handleRetry(mode as any)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{strategy.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{strategy.label}</div>
                        <div className="text-xs text-gray-500">{strategy.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recovery Status */}
            {this.state.isRecovering && (
              <div className="text-center py-4">
                <div className="inline-flex items-center space-x-2 text-orange-600">
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Recovering...</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={this.handleFeedback}
                className="flex-1 px-4 py-2 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-sm"
              >
                Report Issue
              </button>
              <button
                onClick={() => this.handleRetry('reload')}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                Refresh Page
              </button>
            </div>

            {/* Error Details */}
            {this.renderErrorDetails()}
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} ref={ref} />
    </ErrorBoundary>
  ));
};

// Page-level error boundary
export const PageErrorBoundary: React.FC<{
  children: ReactNode;
  pageName: string;
}> = ({ children, pageName }) => (
  <ErrorBoundary
    level="page"
    componentName={pageName}
    enableRecovery={true}
    maxRetries={2}
    onError={(error, errorInfo) => {
      errorService.logError(`Page Error in ${pageName}:`, error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Component-level error boundary
export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
}> = ({ children, componentName, fallback }) => (
  <ErrorBoundary
    level="component"
    componentName={componentName}
    enableRecovery={true}
    maxRetries={3}
    fallback={fallback}
  >
    {children}
  </ErrorBoundary>
);