/**
 * Vitest Configuration for PersonaPass Wallet
 * Comprehensive testing setup with coverage and integration support
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  test: {
    // Test environment configuration
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000/",
      },
    },

    // Global test configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,

    // Test file patterns
    include: [
      "src/**/*.{test,spec}.{js,ts,tsx}",
      "src/tests/**/*.{test,spec}.{js,ts,tsx}",
    ],
    exclude: ["node_modules", "dist", ".next", "coverage"],

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",

      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Service-specific thresholds
        "src/services/*.ts": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Critical components
        "src/services/openid4vpService.ts": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "src/services/openid4vciService.ts": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "src/services/eudiLibIntegrationService.ts": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },

      // Coverage exclusions
      exclude: [
        "node_modules",
        "src/tests/**",
        "src/**/*.test.{js,ts,tsx}",
        "src/**/*.spec.{js,ts,tsx}",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "**/*.d.ts",
        "src/components/ui/BrandShowcase.tsx", // Demo component
        "src/components/performance/PerformanceMonitor.tsx", // Monitoring only
      ],

      // Include all source files for accurate coverage
      all: true,
      src: ["src"],
    },

    // Performance testing
    benchmark: {
      include: ["src/**/*.bench.{js,ts}"],
      exclude: ["node_modules"],
    },

    // Browser testing setup
    browser: {
      enabled: false, // Set to true for browser testing
      name: "chromium",
      headless: true,
    },

    // Snapshot testing
    snapshotSerializers: [],

    // Mock configuration
    deps: {
      external: [],
      inline: [
        // Inline dependencies that need to be transformed
        /@heroicons\/react/,
        /zustand/,
      ],
    },

    // Worker configuration for parallel testing
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true,
      },
    },

    // Retry configuration
    retry: 1,

    // Reporter configuration
    reporter: "verbose",

    // Watch mode configuration
    watch: true,
    watchExclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test-results/**",
    ],
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/components": resolve(__dirname, "./src/components"),
      "@/services": resolve(__dirname, "./src/services"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/store": resolve(__dirname, "./src/store"),
      "@/styles": resolve(__dirname, "./src/styles"),
      "@/tests": resolve(__dirname, "./src/tests"),
    },
  },

  // Build configuration for testing
  build: {
    sourcemap: true,
    minify: false,
  },

  // Server configuration for testing
  server: {
    port: 3000,
    host: "localhost",
  },

  // Define global variables for tests
  define: {
    __TEST_ENV__: true,
    __COVERAGE__: process.env.COVERAGE === "true",
  },
});
