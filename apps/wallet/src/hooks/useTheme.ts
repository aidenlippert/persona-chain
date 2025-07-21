/**
 * Persona Theme System Hook
 * Comprehensive theme management with system preference detection and accessibility
 */

import { useEffect, useState, useCallback } from "react";
import { useWalletStore } from "@/store/walletStore";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

interface ThemeConfig {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  systemPreference: ResolvedTheme;
  isSystemDark: boolean;
  contrastPreference: "normal" | "high";
  motionPreference: "normal" | "reduce";
}

interface UseThemeReturn extends ThemeConfig {
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  applyTheme: (theme: ResolvedTheme) => void;
  isTransitioning: boolean;
}

export const useTheme = (): UseThemeReturn => {
  const { theme: storeTheme, setTheme: setStoreTheme } = useWalletStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [systemPreference, setSystemPreference] =
    useState<ResolvedTheme>("light");
  const [contrastPreference, setContrastPreference] = useState<
    "normal" | "high"
  >("normal");
  const [motionPreference, setMotionPreference] = useState<"normal" | "reduce">(
    "normal",
  );

  // Detect system preferences
  useEffect(() => {
    const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastMediaQuery = window.matchMedia("(prefers-contrast: high)");
    const motionMediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const updateSystemPreference = () => {
      setSystemPreference(darkMediaQuery.matches ? "dark" : "light");
    };

    const updateContrastPreference = () => {
      setContrastPreference(contrastMediaQuery.matches ? "high" : "normal");
    };

    const updateMotionPreference = () => {
      setMotionPreference(motionMediaQuery.matches ? "reduce" : "normal");
    };

    // Initial detection
    updateSystemPreference();
    updateContrastPreference();
    updateMotionPreference();

    // Listen for changes
    darkMediaQuery.addEventListener("change", updateSystemPreference);
    contrastMediaQuery.addEventListener("change", updateContrastPreference);
    motionMediaQuery.addEventListener("change", updateMotionPreference);

    return () => {
      darkMediaQuery.removeEventListener("change", updateSystemPreference);
      contrastMediaQuery.removeEventListener(
        "change",
        updateContrastPreference,
      );
      motionMediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  // Resolve the actual theme based on mode and system preference
  const resolvedTheme: ResolvedTheme =
    storeTheme === "auto" ? systemPreference : (storeTheme as ResolvedTheme);

  // Apply theme to DOM with smooth transition
  const applyTheme = useCallback(
    (theme: ResolvedTheme) => {
      const root = document.documentElement;

      // Add transition class for smooth theme changes
      if (motionPreference === "normal") {
        root.classList.add("theme-transition");
        setIsTransitioning(true);
      }

      // Apply theme
      if (theme === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }

      // Apply accessibility preferences
      if (contrastPreference === "high") {
        root.classList.add("high-contrast");
      } else {
        root.classList.remove("high-contrast");
      }

      if (motionPreference === "reduce") {
        root.classList.add("reduce-motion");
      } else {
        root.classList.remove("reduce-motion");
      }

      // Remove transition class after animation completes
      if (motionPreference === "normal") {
        setTimeout(() => {
          root.classList.remove("theme-transition");
          setIsTransitioning(false);
        }, 200);
      }
    },
    [contrastPreference, motionPreference],
  );

  // Set theme mode
  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setStoreTheme(mode);
    },
    [setStoreTheme],
  );

  // Toggle between light and dark (ignores auto mode)
  const toggleTheme = useCallback(() => {
    if (resolvedTheme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, [resolvedTheme, setTheme]);

  // Apply theme when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme, applyTheme]);

  return {
    mode: storeTheme,
    resolved: resolvedTheme,
    systemPreference,
    isSystemDark: systemPreference === "dark",
    contrastPreference,
    motionPreference,
    setTheme,
    toggleTheme,
    applyTheme,
    isTransitioning,
  };
};
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeProvider = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return theme === 'dark';
    }
    return true; // Default to dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      if (theme === 'system') {
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(systemIsDark);
        root.removeAttribute('data-theme');
      } else {
        setIsDark(theme === 'dark');
        root.setAttribute('data-theme', theme);
      }
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme, isDark };
};

/**
 * Theme utility functions for components
 */
export const themeUtils = {
  /**
   * Get theme-aware class names
   */
  getThemeClasses: (
    lightClass: string,
    darkClass: string,
    theme: ResolvedTheme,
  ) => {
    return theme === "dark" ? darkClass : lightClass;
  },

  /**
   * Get theme-aware icon
   */
  getThemeIcon: (theme: ResolvedTheme) => {
    return theme === "dark" ? "🌙" : "☀️";
  },

  /**
   * Check if current theme is dark
   */
  isDark: (theme: ResolvedTheme) => theme === "dark",

  /**
   * Get contrast ratio safe colors
   */
  getContrastSafeColors: (contrastPreference: "normal" | "high") => {
    if (contrastPreference === "high") {
      return {
        primary: "#000000",
        secondary: "#ffffff",
        accent: "#0066cc",
      };
    }
    return {
      primary: "var(--pp-text-primary)",
      secondary: "var(--pp-text-secondary)",
      accent: "var(--pp-primary-600)",
    };
  },
};
