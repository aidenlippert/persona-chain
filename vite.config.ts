import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import { VitePWA } from "vite-plugin-pwa"; // 🚧 TEMPORARILY DISABLED
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { visualizer } from "rollup-plugin-visualizer";
// REMOVED: import wasm from "vite-plugin-wasm"; // 🚨 CRITICAL: Disabled to prevent WASM loading
import path from "path";

// 🚨 ULTRA-AGGRESSIVE WASM BLOCKER - Complete prevention at build time
const wasmBlockerPlugin = () => ({
  name: 'wasm-blocker',
  transform(code: string, id: string) {
    // Target ALL libraries that might use WASM - Enhanced for Noble v1.9.4
    if (id.includes('@noble/curves') || id.includes('noble-curves') || id.includes('secp256k1')) {
      console.log(`[VITE-WASM-BLOCKER] 🎯 TIER-1 WASM DISABLING in: ${id}`);
      
      let transformedCode = code;
      
      // 🚨 CRITICAL: Inject Tier-1 WASM disabling at the top of Noble modules
      transformedCode = `
// 🔐 TIER-1 WASM DISABLING - Injected at build time
if (typeof globalThis !== 'undefined') {
  globalThis.process = { env: { NOBLE_DISABLE_WASM: 'true' } };
  globalThis.__NOBLE_DISABLE_WASM__ = true;
  globalThis.WebAssembly = undefined; // Complete WebAssembly blocking
}
if (typeof window !== 'undefined') {
  window.WebAssembly = undefined; // Browser-specific blocking
}
console.log('[VITE-WASM-BLOCKER] 🎯 TIER-1 NOBLE WASM DISABLED');
${transformedCode}`;
      
      // 🔥 DESTROY all WASM-related code patterns
      
      // 1. Replace all dynamic imports of .wasm files
      transformedCode = transformedCode.replace(
        /import\(['"`][^'"`]*\.wasm['"`]\)/g, 
        'Promise.resolve(null) // WASM blocked - JS fallback'
      );
      
      // 2. Replace await import() patterns for WASM
      transformedCode = transformedCode.replace(
        /await\s+import\(['"`][^'"`]*\.wasm['"`]\)/g, 
        'null // WASM blocked - JS fallback'
      );
      
      // 3. Replace fetch calls for .wasm files - Multiple patterns
      transformedCode = transformedCode.replace(
        /fetch\(['"`][^'"`]*\.wasm['"`]\)/g,
        'Promise.reject(new TypeError("WASM_DISABLED: Network error")) // WASM blocked - triggers JS fallback'
      );
      
      // Also handle template literal fetch calls
      transformedCode = transformedCode.replace(
        /fetch\(`[^`]*\.wasm`\)/g,
        'Promise.reject(new TypeError("WASM_DISABLED: Network error")) // WASM blocked - triggers JS fallback'
      );
      
      // Handle dynamic fetch calls with variables
      transformedCode = transformedCode.replace(
        /fetch\([^)]*wasmUrl[^)]*\)/g,
        'Promise.reject(new TypeError("WASM_DISABLED: Network error")) // WASM blocked - triggers JS fallback'
      );
      
      // 4. Replace any WebAssembly.instantiate calls with graceful fallback
      transformedCode = transformedCode.replace(
        /WebAssembly\.instantiate\(/g,
        '(() => Promise.reject(new TypeError("WASM_DISABLED: WebAssembly disabled")))( // WASM blocked'
      );
      
      // 5. Replace WebAssembly.instantiateStreaming calls with graceful fallback
      transformedCode = transformedCode.replace(
        /WebAssembly\.instantiateStreaming\(/g,
        '(() => Promise.reject(new TypeError("WASM_DISABLED: WebAssembly disabled")))( // WASM blocked'
      );
      
      // 6. Replace WebAssembly.compile calls
      transformedCode = transformedCode.replace(
        /WebAssembly\.compile\(/g,
        '(() => Promise.reject(new TypeError("WASM_DISABLED: WebAssembly disabled")))( // WASM blocked'
      );
      
      // 7. Replace WebAssembly.compileStreaming calls
      transformedCode = transformedCode.replace(
        /WebAssembly\.compileStreaming\(/g,
        '(() => Promise.reject(new TypeError("WASM_DISABLED: WebAssembly disabled")))( // WASM blocked'
      );
      
      // 8. Block all .wasm file references more carefully
      transformedCode = transformedCode.replace(
        /(['"`])([^'"`]*?)\.wasm\1/g,
        '$1data:application/wasm;base64,INVALID$1'
      );
      
      // 9. Disable any WASM-related flags/variables
      transformedCode = transformedCode.replace(
        /const\s+wasmSupported\s*=\s*true/g,
        'const wasmSupported = false'
      );
      
      transformedCode = transformedCode.replace(
        /let\s+wasmSupported\s*=\s*true/g,
        'let wasmSupported = false'
      );
      
      // 10. Force disable WASM in noble library specifically
      transformedCode = transformedCode.replace(
        /const\s+WASM_DISABLE\s*=\s*false/g,
        'const WASM_DISABLE = true'
      );
      
      transformedCode = transformedCode.replace(
        /let\s+WASM_DISABLE\s*=\s*false/g,
        'let WASM_DISABLE = true'
      );
      
      return transformedCode;
    }
    
    return code;
  },
  generateBundle(options: any, bundle: any) {
    // Remove any WASM files from final bundle (except circuits)
    Object.keys(bundle).forEach(fileName => {
      if (fileName.endsWith('.wasm') && !fileName.includes('circuits')) {
        console.log(`[VITE-WASM-BLOCKER] 🗑️ Removing WASM file from bundle: ${fileName}`);
        delete bundle[fileName];
      }
    });
    
    // Also scan and clean any WASM references in JavaScript bundles
    Object.keys(bundle).forEach(fileName => {
      if (fileName.endsWith('.js')) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.code) {
          // Remove any remaining secp256k1 WASM references
          const originalCode = chunk.code;
          
          // Block WASM fetch calls with Promise rejection
          chunk.code = chunk.code.replace(
            /fetch\(['"`]([^'"`]*\.wasm)['"`]\)/g,
            'Promise.reject(new TypeError("WASM_DISABLED: $1 blocked"))'
          );
          
          // Replace remaining WASM URL strings more carefully
          chunk.code = chunk.code.replace(
            /(['"`])([^'"`]*?)\.wasm\1/g,
            '$1data:application/wasm;base64,INVALID$1'
          );
          
          // Handle secp256k1 specific patterns more carefully  
          chunk.code = chunk.code.replace(
            /(['"`])(secp256k1-[A-Za-z0-9]+)\.wasm\1/g,
            '$1data:application/wasm;base64,INVALID$1'
          );
          
          if (originalCode !== chunk.code) {
            console.log(`[VITE-WASM-BLOCKER] 🧹 Cleaned WASM references in: ${fileName}`);
          }
        }
      }
    });
  }
});

export default defineConfig(({ command: _command, mode }) => ({
  plugins: [
    react({
      // Use automatic JSX runtime for better performance
      jsxRuntime: 'automatic'
    }),
    wasmBlockerPlugin(), // 🚨 CRITICAL: Block WASM at build time
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Enable polyfills for these Node.js modules
      protocolImports: true,
      // Include specific modules that need polyfills
      include: ["buffer", "crypto", "stream", "util", "process"],
      // Exclude problematic modules that should use browser versions
      exclude: ["fs", "path"],
    }),
    // 🚧 TEMPORARILY DISABLED PWA PLUGIN DUE TO BUILD ERROR
    // "Cannot add property 0, object is not extensible" - investigating fix
    // VitePWA({
    //   registerType: "autoUpdate",
    //   injectRegister: "auto",
    //   workbox: {
    //     globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
    //     maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit for ZK proof bundles
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\./,
    //         handler: "NetworkFirst",
    //         options: {
    //           cacheName: "api-cache",
    //         },
    //       },
    //       // Force network first for HTML pages to prevent white screen
    //       {
    //         urlPattern: ({ request }) => request.mode === 'navigate',
    //         handler: "NetworkFirst",
    //         options: {
    //           cacheName: "pages-cache",
    //           networkTimeoutSeconds: 1,
    //         },
    //       },
    //       // Force network first for all HTML documents
    //       {
    //         urlPattern: /\.html$/,
    //         handler: "NetworkFirst",
    //         options: {
    //           cacheName: "html-cache",
    //           networkTimeoutSeconds: 1,
    //         },
    //       },
    //       // Force network first for JS files to ensure latest version
    //       {
    //         urlPattern: /\.js$/,
    //         handler: "NetworkFirst",
    //         options: {
    //           cacheName: "js-cache",
    //           networkTimeoutSeconds: 2,
    //         },
    //       },
    //     ],
    //     cleanupOutdatedCaches: true,
    //     skipWaiting: true,
    //     clientsClaim: true,
    //     // Add cache busting for deployments
    //     dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
    //   },
    //   devOptions: {
    //     enabled: true,
    //     type: "module",
    //     navigateFallback: "index.html",
    //   },
    //   manifest: {
    //     name: "Persona Identity Wallet",
    //     short_name: "Persona",
    //     description: "Decentralized Identity Wallet - Create, manage, and share verifiable credentials",
    //     theme_color: "#ea580c",
    //     background_color: "#ffffff",
    //     display: "standalone",
    //     orientation: "portrait-primary",
    //     start_url: "/",
    //     scope: "/",
    //     categories: ["productivity", "security", "utilities"],
    //     lang: "en",
    //     icons: [
    //       {
    //         src: "/icon.svg",
    //         sizes: "192x192",
    //         type: "image/svg+xml",
    //         purpose: "any maskable"
    //       },
    //       {
    //         src: "/icon.svg",
    //         sizes: "512x512", 
    //         type: "image/svg+xml",
    //         purpose: "any maskable"
    //       }
    //     ],
    //     screenshots: [
    //       {
    //         src: "/screenshot-mobile.png",
    //         sizes: "375x812",
    //         type: "image/png",
    //         form_factor: "narrow"
    //       },
    //       {
    //         src: "/screenshot-desktop.png", 
    //         sizes: "1280x720",
    //         type: "image/png",
    //         form_factor: "wide"
    //       }
    //     ],
    //     shortcuts: [
    //       {
    //         name: "Create Credential",
    //         short_name: "Create",
    //         description: "Quickly create a new verifiable credential",
    //         url: "/credentials?action=create",
    //         icons: [{ src: "/icon.svg", sizes: "96x96" }]
    //       },
    //       {
    //         name: "View Proofs",
    //         short_name: "Proofs", 
    //         description: "View your ZK proofs",
    //         url: "/proofs",
    //         icons: [{ src: "/icon.svg", sizes: "96x96" }]
    //       }
    //     ]
    //   },
    // }),
    // Add bundle analyzer for production builds
    mode === 'analyze' && visualizer({
      filename: "dist/bundle-analysis.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  define: {
    global: "globalThis",
    // Properly set NODE_ENV for React
    'process.env.NODE_ENV': JSON.stringify(mode),
    // Enable React production optimizations
    __DEV__: mode !== 'production',
    // 🚨 CRITICAL: Disable WASM completely to prevent @noble/curves loading
    '__NOBLE_DISABLE_WASM__': true,
    '__NOBLE_WASM_DISABLE__': true,
    'process.env.NOBLE_DISABLE_WASM': '"true"',
  },
  esbuild: {
    // Additional esbuild configuration for React optimization
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    // Enable JSX optimizations for production
    jsx: 'automatic',
    jsxDev: mode !== 'production',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' http://localhost:8080 https://personachain-prod.uc.r.appspot.com wss://personachain-prod.uc.r.appspot.com https://api.stripe.com;
        font-src 'self' data:;
        worker-src 'self' blob:;
        frame-src 'self' https://js.stripe.com https://*.stripe.com;
        child-src 'self' https://js.stripe.com https://*.stripe.com;
        frame-ancestors 'none';
      `.replace(/\s+/g, ' ').trim()
    },
    // Ensure proper WASM MIME type handling
    middlewareMode: false,
    proxy: {
      "/api/v1": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // Proxy PersonaChain DID endpoints to our local backend
      "/persona_chain": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // Proxy GitHub connector specifically
      "/api/connectors/github": {
        target: "http://localhost:3001/api/v1/github",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace("/api/connectors/github", ""),
      },
    },
  },
  build: {
    // 🚀 STATE-OF-THE-ART BUILD CONFIG - Advanced optimization
    rollupOptions: {
      // Allow WASM files to be bundled properly
      external: [],
      output: {
        // 🚨 EMERGENCY BUNDLE SIZE REDUCTION - Aggressive code splitting
        manualChunks: (id) => {
          // Split each major component into its own chunk
          if (id.includes('EliteWeb3Button')) return 'elite-web3-button';
          if (id.includes('CredentialsPage')) return 'credentials-page';
          if (id.includes('ZKPDashboard')) return 'zkp-dashboard';
          if (id.includes('IdentityVerificationPage')) return 'identity-verification';
          
          // Split large libraries
          if (id.includes('snarkjs')) return 'snarkjs';
          if (id.includes('circomlib')) return 'circomlib';
          if (id.includes('ffjavascript')) return 'ffjavascript';
          if (id.includes('@noble/curves')) return 'noble-curves';
          if (id.includes('ethers')) return 'ethers';
          if (id.includes('framer-motion')) return 'framer-motion';
          
          // Split React ecosystem
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-core';
          if (id.includes('node_modules/react-router')) return 'react-router';
          
          // Split UI libraries
          if (id.includes('@heroicons/react')) return 'heroicons';
          if (id.includes('@headlessui/react')) return 'headlessui';
          
          // Default chunk for everything else
          if (id.includes('node_modules')) return 'vendor';
        },
        // 🎯 OPTIMIZED CHUNK NAMING
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 🚀 MODERN BUILD TARGETS - Support top-level await
    target: 'esnext', // Support latest features including top-level await
    minify: mode === 'production' ? 'esbuild' : false,
    chunkSizeWarningLimit: 500, // Strict 500KB limit
    assetsInlineLimit: 4096, // Inline small assets
    // 📊 BUILD ANALYSIS
    reportCompressedSize: true,
    sourcemap: mode === 'development' ? 'eval-cheap-module-source-map' : false,
  },
  optimizeDeps: {
    include: ["buffer", "crypto-browserify", "stream-browserify", "util"],
    exclude: [
      "vite-plugin-node-polyfills/shims/buffer",
      "vite-plugin-node-polyfills/shims/global",
      "vite-plugin-node-polyfills/shims/process",
    ],
  },
}));
