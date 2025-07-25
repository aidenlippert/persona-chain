/**
 * Error Boundary Component
 * Catches JavaScript errors and provides fallback UI
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { errorService } from "@/services/errorService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  suppressed?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Suppress specific errors that are not critical to application functionality
    const errorMessage = error.message || '';
    
    // List of error patterns to suppress (don't show error UI)
    const suppressedErrorPatterns = [
      'Invalid or unexpected token', // JSON parsing errors from external sources
      'Node cannot be found',        // React DevTools/extension issues
      'ResizeObserver loop limit',    // ResizeObserver harmless warnings
      'Non-Error promise rejection', // Promise rejections that aren't actual errors
      'Loading CSS chunk',           // Dynamic import CSS loading issues
      'Loading chunk',               // Dynamic import loading issues
    ];
    
    // Check if this error should be suppressed
    const shouldSuppress = suppressedErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (shouldSuppress) {
      // Log that we're suppressing this error but don't show error UI
      console.log(`[SHIELD] Error boundary: Suppressed error in getDerivedStateFromError ${errorMessage}`);
      return { hasError: false, error, suppressed: true }; // Mark as suppressed
    }
    
    // For genuine errors, update state to show error UI
    errorService.logError(`[ALERT] Error boundary: Showing error UI for genuine error: ${errorMessage}`);
    return { hasError: true, error, suppressed: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error.message || '';
    
    // Same suppression patterns as getDerivedStateFromError
    const suppressedErrorPatterns = [
      'Invalid or unexpected token',
      'Node cannot be found',
      'ResizeObserver loop limit',
      'Non-Error promise rejection',
      'Loading CSS chunk',
      'Loading chunk',
    ];
    
    const shouldSuppress = suppressedErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (shouldSuppress) {
      // Log but don't update state for suppressed errors
      console.log(`[SHIELD] Error boundary: Suppressed error in componentDidCatch ${errorMessage}`);
      return; // The state is already set to suppressed in getDerivedStateFromError
    }
    
    // For genuine errors, log and update state
    errorService.logError(`[ALERT] ErrorBoundary caught a genuine error: ${error.message}`, error);
    
    // Capture specific error types for better handling
    if (error.message.includes('Node cannot be found')) {
      console.warn('DOM Node error detected - likely React DevTools or external library issue');
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRefresh = () => {
    // Clear cache and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    // Don't show error UI for suppressed errors
    if (this.state.suppressed) {
      console.log('[SHIELD] Error boundary: Rendering children despite suppressed error');
      return this.props.children;
    }
    
    if (this.state.hasError) {
      const isNodeError = this.state.error?.message.includes('Node cannot be found');
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-orange-500"
          >
            {/* Error Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-4xl text-white mx-auto mb-6 shadow-lg"
            >
[!]
            </motion.div>

            {/* Error Message */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">
                {isNodeError ? 'Display Issue Detected' : 'Something went wrong'}
              </h2>
              <p className="text-gray-700">
                {isNodeError 
                  ? 'This is usually a harmless browser extension issue. Try refreshing the page.'
                  : 'An unexpected error occurred. Please try refreshing the page.'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={this.handleRefresh}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Refresh Page
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={this.handleReset}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
              >
                Try Again
              </motion.button>
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && (
              <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-left"
              >
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 font-mono overflow-auto max-h-40">
                  <p className="font-bold">Error:</p>
                  <p className="mb-2">{this.state.error?.message}</p>
                  <p className="font-bold">Stack:</p>
                  <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                </div>
              </motion.details>
            )}

            {/* PersonaPass Branding */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Powered by{' '}
                <span className="font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  PersonaPass
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}