/**
 * Test setup configuration for Persona Wallet tests
 */

import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

// Mock crypto API
const mockCrypto = {
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn(),
  },
};

// Mock WebAuthn API
const mockWebAuthn = {
  create: vi.fn(),
  get: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
  // Mock browser APIs
  Object.defineProperty(global, "indexedDB", {
    value: mockIndexedDB,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "crypto", {
    value: mockCrypto,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "navigator", {
    value: {
      ...global.navigator,
      credentials: mockWebAuthn,
    },
    writable: true,
    configurable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "sessionStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
