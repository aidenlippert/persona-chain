/**
 * Persona Wallet Entry Point - ULTIMATE CACHE BUSTER v3
 */

// WASM functionality restored for legitimate ZK proof operations
import { logWASMStatus } from "./utils/wasmTest";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/globals.css";
import "./styles/components.css";
import { configService } from "./config";
import { errorService } from "@/services/errorService";
import { productionErrorTracker } from "./services/productionErrorTracker";
import { workflowTester } from "./utils/workflowTester";

// Initialize configuration service early
try {
  configService.initialize();
  console.log("[SUCCESS] Configuration service initialized successfully - CACHE BUST v3");
} catch (error) {
  errorService.logError("[ERROR] Failed to initialize configuration service:", error);
  // Continue with application startup using fallback values
}

// 🚀 Initialize Production Monitoring Systems
console.log("🔥 Initializing PersonaPass Production Systems...");

// Test WASM functionality
console.log("🧪 Testing WASM functionality...");
logWASMStatus();

// Initialize error tracking
try {
  productionErrorTracker; // Initialize singleton
  console.log("✅ Production error tracking initialized");
} catch (error) {
  console.error("❌ Failed to initialize error tracking:", error);
}

// Initialize workflow testing (run critical tests after app loads)
try {
  workflowTester; // Initialize singleton
  console.log("✅ Workflow testing system initialized");
  
  // Run critical workflow tests after initial render
  setTimeout(async () => {
    try {
      console.log("🧪 Running critical workflow tests...");
      const summary = await workflowTester.runCriticalTests();
      console.log("📊 Critical tests summary:", summary);
      
      if (summary.overallHealth === 'critical') {
        console.error("🚨 CRITICAL: Core workflows failing!");
      } else if (summary.overallHealth === 'degraded') {
        console.warn("⚠️ WARNING: Some workflows degraded");
      } else {
        console.log("✅ All critical workflows passing");
      }
    } catch (testError) {
      console.error("❌ Failed to run workflow tests:", testError);
    }
  }, 3000); // Wait 3 seconds for app to stabilize
} catch (error) {
  console.error("❌ Failed to initialize workflow testing:", error);
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
  const reasonStr = String(event.reason);
  
  // Suppress extension errors only (keep WASM errors visible for debugging)
  if (reasonStr.includes('Node cannot be found') ||
      reasonStr.includes('chrome-extension')) {
    event.preventDefault();
    return;
  }
  
  errorService.logError('Unhandled promise rejection:', event.reason);
});

// Global error handler - suppress extension errors only
window.addEventListener('error', (event) => {
  // SAFELY filter out extension errors only
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
  
  // Log ALL errors including WASM errors for debugging
  errorService.logError('[ALERT] Global Error Handler - Application Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Enhanced console filtering - suppress extension errors only
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  
  // Suppress extension-related errors only
  if (message.includes('chrome-extension') ||
      message.includes('moz-extension') ||
      (message.includes('hook.js') && message.includes('overrideMethod'))) {
    return;
  }
  
  // Allow all other errors through including WASM errors for debugging
  originalConsoleError.apply(console, args);
};

// Enhanced React DevTools compatibility with error suppression
try {
  if (typeof window !== 'undefined') {
    // Create a more comprehensive React DevTools hook to prevent errors
    if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        checkDCE: () => {},
        supportsFiber: true,
        inject: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        isDisabled: false,
        // Additional methods to prevent hook.js errors
        overrideMethod: () => {},
        onScheduleFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        renderer: null,
        renderers: new Map(),
        // Suppress overrideMethod errors specifically
        _overrideMethod: () => {},
      };
    }
    
    // Specifically handle overrideMethod errors from extensions
    const originalHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (originalHook && typeof originalHook.overrideMethod === 'function') {
      const originalOverrideMethod = originalHook.overrideMethod;
      originalHook.overrideMethod = function(...args) {
        try {
          return originalOverrideMethod.apply(this, args);
        } catch (error) {
          // Silently suppress overrideMethod errors
          return;
        }
      };
    }
  }
} catch (e) {
  // Ignore all hook setup errors
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
