import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import { VitePWA } from "vite-plugin-pwa"; // 🚧 TEMPORARILY DISABLED
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { visualizer } from "rollup-plugin-visualizer";
import wasm from "vite-plugin-wasm";
import path from "path";

export default defineConfig(({ command: _command, mode }) => ({
  plugins: [
    react({
      // Use automatic JSX runtime for better performance
      jsxRuntime: 'automatic'
    }),
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
  },
  esbuild: {
    // Additional esbuild configuration for React optimization
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    // Enable JSX optimizations for production
    jsx: 'automatic',
    jsxDev: mode !== 'production',
    // Support for BigInt and top-level await
    supported: {
      bigint: true,
      'top-level-await': true
    },
    target: 'es2020',
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
    // 🔧 MINIMAL BUILD CONFIG TO AVOID ROLLUP EXTENSIBILITY ERRORS
    rollupOptions: {
      // Completely disable rollup optimizations that cause extensibility issues
      treeshake: false,
    },
    // Basic build settings only - React optimization handled via environment variables
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'], // Support BigInt and modern features
    minify: mode === 'production' ? 'esbuild' : false, // Enable minification for production React
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 0,
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
