/**
 * Persona Wallet Entry Point - ULTIMATE CACHE BUSTER v3
 */

// 🚨 CRITICAL FIX: Disable WASM before any other imports
import "./utils/wasmDisabler";

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
  
  // Suppress WASM and extension errors
  if (reasonStr.includes('WASM_SILENTLY_BLOCKED') ||
      reasonStr.includes('WASM file completely blocked') ||
      reasonStr.includes('WebAssembly') ||
      reasonStr.includes('wasm') ||
      reasonStr.includes('Node cannot be found') ||
      reasonStr.includes('chrome-extension')) {
    event.preventDefault();
    return;
  }
  
  errorService.logError('Unhandled promise rejection:', event.reason);
});

// SAFE global error handler - suppress extension and WASM errors
window.addEventListener('error', (event) => {
  // SAFELY filter out extension errors and WASM errors
  const shouldSuppress = 
    // Browser extensions - must be very specific
    event.filename?.includes('chrome-extension://') ||
    event.filename?.includes('moz-extension://') ||
    event.filename?.includes('contentScripts') ||
    event.filename?.includes('injectedScript') ||
    (event.filename?.includes('hook.js') && event.message?.includes('extension')) ||
    // WASM-related errors that we've intentionally blocked
    event.message?.includes('WebAssembly') ||
    event.message?.includes('wasm') ||
    event.message?.includes('MIME type') ||
    event.message?.includes('application/wasm') ||
    event.message?.includes('WASM_SILENTLY_BLOCKED') ||
    event.message?.includes('WASM file completely blocked');

  if (shouldSuppress) {
    // Prevent extension and WASM errors from appearing
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

// Enhanced console filtering - suppress extension and WASM errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  
  // Suppress extension-related and WASM-related errors
  if (message.includes('chrome-extension') ||
      message.includes('moz-extension') ||
      (message.includes('hook.js') && message.includes('overrideMethod')) ||
      message.includes('WebAssembly') ||
      message.includes('wasm') ||
      message.includes('MIME type') ||
      message.includes('application/wasm') ||
      message.includes('WASM_SILENTLY_BLOCKED') ||
      message.includes('WASM file completely blocked') ||
      message.includes('Failed to execute \'compile\' on \'WebAssembly\'')) {
    return;
  }
  
  // Allow all other errors through
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
