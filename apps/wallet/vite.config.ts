import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { visualizer } from "rollup-plugin-visualizer";
import wasm from "vite-plugin-wasm";
import path from "path";

export default defineConfig(({ command: _command, mode }) => ({
  plugins: [
    react(),
    wasm(),
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
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit for ZK proof bundles
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
            },
          },
          // Force network first for HTML pages to prevent white screen
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 1,
            },
          },
          // Force network first for all HTML documents
          {
            urlPattern: /\.html$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 1,
            },
          },
          // Force network first for JS files to ensure latest version
          {
            urlPattern: /\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-cache",
              networkTimeoutSeconds: 2,
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Add cache busting for deployments
        dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
      manifest: {
        name: "Persona Identity Wallet",
        short_name: "Persona",
        description: "Decentralized Identity Wallet - Create, manage, and share verifiable credentials",
        theme_color: "#ea580c",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "security", "utilities"],
        lang: "en",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "/icon.svg",
            sizes: "512x512", 
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        screenshots: [
          {
            src: "/screenshot-mobile.png",
            sizes: "375x812",
            type: "image/png",
            form_factor: "narrow"
          },
          {
            src: "/screenshot-desktop.png", 
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide"
          }
        ],
        shortcuts: [
          {
            name: "Create Credential",
            short_name: "Create",
            description: "Quickly create a new verifiable credential",
            url: "/credentials?action=create",
            icons: [{ src: "/icon.svg", sizes: "96x96" }]
          },
          {
            name: "View Proofs",
            short_name: "Proofs", 
            description: "View your ZK proofs",
            url: "/proofs",
            icons: [{ src: "/icon.svg", sizes: "96x96" }]
          }
        ]
      },
    }),
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
    rollupOptions: {
      external: [],
      output: {
        // More aggressive chunk splitting to isolate React issues
        manualChunks: (id) => {
          // Isolate React core separately to prevent syntax issues
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          if (id.includes('react') && !id.includes('react-dom') && !id.includes('react-router')) {
            return 'react-core';
          }
          
          // Routing
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Heavy crypto libraries (lazy load)
          if (id.includes('@noble') || id.includes('multiformats')) {
            return 'crypto';
          }
          
          // ZK proof libraries (lazy load)
          if (id.includes('snarkjs') || id.includes('circomlib')) {
            return 'zkproof';
          }
          
          // UI libraries
          if (id.includes('framer-motion') || id.includes('@heroicons')) {
            return 'ui';
          }
          
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          
          // Node modules vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Force specific naming to prevent CDN cache issues
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    // Re-enable minification but with safer settings
    minify: 'terser',
    terserOptions: {
      compress: {
        // Disable problematic optimizations that can break numeric syntax
        unsafe: false,
        unsafe_arrows: false, 
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_methods: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: false,
        // Safe numeric transformations
        evaluate: false,
      },
      mangle: {
        // Safe mangling options
        safari10: true,
      },
      format: {
        // Preserve certain syntax to prevent parsing errors
        preserve_annotations: true,
        beautify: false,
      },
    },
    target: 'es2022', // Support top-level await for WebAssembly
    cssCodeSplit: true,
    sourcemap: false,
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
