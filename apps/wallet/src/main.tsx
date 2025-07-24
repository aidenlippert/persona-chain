/**
 * Persona Wallet Entry Point - ULTIMATE CACHE BUSTER v3
 */

// Import BigInt polyfill first to ensure compatibility
import "./polyfills/bigint";

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
  console.log("[SUCCESS] Configuration service initialized successfully - CACHE BUST v3");
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

// Minimal console filtering - only suppress clear extension errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  
  // Only suppress clearly extension-related errors
  if (message.includes('chrome-extension') ||
      message.includes('moz-extension') ||
      message.includes('hook.js') && message.includes('overrideMethod')) {
    return;
  }
  
  // Allow all other errors through
  originalConsoleError.apply(console, args);
};

// Minimal React DevTools compatibility
try {
  if (typeof window !== 'undefined' && !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // Only set up if not already present
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      checkDCE: () => {},
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };
  }
} catch (e) {
  // Ignore errors
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
