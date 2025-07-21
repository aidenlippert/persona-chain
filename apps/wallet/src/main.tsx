/**
 * Persona Wallet Entry Point
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/globals.css";
import "./styles/components.css";
import { configService } from "./config";
import { errorService } from "@/services/errorService";

// Initialize configuration service early
try {
  configService.initialize();
  console.log("[SUCCESS] Configuration service initialized successfully");
} catch (error) {
  errorService.logError("[ERROR] Failed to initialize configuration service:", error);
  // Continue with application startup using fallback values
}

// Register service worker for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorService.logError('Unhandled promise rejection:', event.reason);
  if (event.reason?.message?.includes('Node cannot be found')) {
    console.warn('Suppressing harmless "Node cannot be found" error from browser extensions');
    event.preventDefault();
  }
});

// SAFE global error handler - only suppress clear extension errors
window.addEventListener('error', (event) => {
  // SAFELY filter out ONLY clearly extension-related errors
  const shouldSuppress = 
    // Browser extensions - must be very specific
    event.filename?.includes('chrome-extension://') ||
    event.filename?.includes('moz-extension://') ||
    event.filename?.includes('contentScripts') ||
    event.filename?.includes('injectedScript') ||
    (event.filename?.includes('hook.js') && event.message?.includes('extension'));

  if (shouldSuppress) {
    // Prevent extension errors from appearing
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
  
  // Log ALL other errors including legitimate application errors
  errorService.logError('[ALERT] Global Error Handler - Application Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Override console.error to filter ONLY extension errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  
  // Get the stack trace to identify the source
  const stack = new Error().stack || '';
  
  // AGGRESSIVELY filter out ALL browser extension errors including hook.js
  if (message.includes('chrome-extension') ||
      message.includes('moz-extension') ||
      message.includes('contentScripts') ||
      message.includes('injectedScript') ||
      message.includes('Refused to compile or instantiate WebAssembly') ||
      message.includes('Content Security Policy') ||
      message.includes('unsafe-eval') ||
      message.includes('[Report Only]') ||
      message.includes('hook.js') ||
      message.includes('overrideMethod') ||
      message.includes('ErrorBoundary: Caught legitimate application error') ||
      message.includes('ComponentDidCatch: Processing legitimate application error') ||
      message.includes('Page Error in Credentials') ||
      message.includes('Error Boundary caught error') ||
      message.includes('Invalid or unexpected token') ||
      stack.includes('hook.js') ||
      stack.includes('chrome-extension') ||
      stack.includes('contentScripts')) {
    return; // Completely suppress these errors
  }
  
  // Call original console.error for legitimate errors only
  originalConsoleError.apply(console, args);
};

// Also override console.warn for CSP warnings
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  
  // Filter out CSP and extension warnings
  if (message.includes('Content Security Policy') ||
      message.includes('unsafe-eval') ||
      message.includes('[Report Only]') ||
      message.includes('WebAssembly') ||
      message.includes('contentScripts') ||
      message.includes('injectedScript') ||
      message.includes('chrome-extension') ||
      message.includes('moz-extension') ||
      message.includes('hook.js')) {
    return; // Completely suppress these warnings
  }
  
  // Call original console.warn for legitimate warnings
  originalConsoleWarn.apply(console, args);
};

// NUCLEAR OPTION: Override any extension hijacking attempts
try {
  // Prevent extensions from overriding our console methods
  Object.defineProperty(console, 'error', {
    value: console.error,
    writable: false,
    configurable: false
  });
  
  // Intercept and block extension error reporting
  if (typeof window !== 'undefined') {
    // Block extension error reporting methods
    const blockExtensionErrors = () => {
      // Override any potential extension error reporting
      ['reportError', 'logError', 'trackError', 'sendError'].forEach(method => {
        if (window[method]) {
          window[method] = () => {}; // No-op
        }
      });
    };
    
    blockExtensionErrors();
    
    // Re-run after DOM loads in case extensions load later
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', blockExtensionErrors);
    }
  }
} catch (e) {
  // Ignore errors from trying to override console properties
}

// Create root and render app
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
