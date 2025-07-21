/**
 * Persona Accessibility Hook
 * WCAG 2.1 AA+ compliance utilities and accessibility features
 */

import { useEffect, useState, useCallback, useRef } from "react";

interface AccessibilityState {
  // Keyboard navigation
  isKeyboardNavigation: boolean;
  // Screen reader detection
  isScreenReaderActive: boolean;
  // Focus management
  focusVisible: boolean;
  // Announcements
  announcements: string[];
  // High contrast mode
  highContrast: boolean;
  // Reduced motion preference
  reducedMotion: boolean;
  // Font size preference
  fontSize: "small" | "normal" | "large" | "extra-large";
}

interface UseAccessibilityReturn extends AccessibilityState {
  // Actions
  announce: (message: string, priority?: "polite" | "assertive") => void;
  setFocusVisible: (visible: boolean) => void;
  trapFocus: (container: HTMLElement) => () => void;
  restoreFocus: (element?: HTMLElement) => void;
  // Utilities
  getAriaLabel: (base: string, context?: string) => string;
  getAriaDescription: (description: string) => string;
  generateId: (prefix?: string) => string;
  // Validation
  validateColorContrast: (foreground: string, background: string) => boolean;
  checkAccessibility: (element: HTMLElement) => AccessibilityIssue[];
}

interface AccessibilityIssue {
  type: "error" | "warning" | "info";
  message: string;
  element: HTMLElement;
  fix?: string;
}

let idCounter = 0;

export const useAccessibility = (): UseAccessibilityReturn => {
  const [state, setState] = useState<AccessibilityState>({
    isKeyboardNavigation: false,
    isScreenReaderActive: false,
    focusVisible: false,
    announcements: [],
    highContrast: false,
    reducedMotion: false,
    fontSize: "normal",
  });

  const announceRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = () => {
      setState((prev) => ({ ...prev, isKeyboardNavigation: true }));
    };

    const handleMouseDown = () => {
      setState((prev) => ({ ...prev, isKeyboardNavigation: false }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Detect screen reader and other accessibility preferences
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaHidden = document.querySelector("[aria-hidden]");
      const hasAriaLabel = document.querySelector("[aria-label]");
      const hasRole = document.querySelector("[role]");

      // Basic heuristic - not foolproof but better than nothing
      setState((prev) => ({
        ...prev,
        isScreenReaderActive: !!(hasAriaHidden || hasAriaLabel || hasRole),
      }));
    };

    const detectHighContrast = () => {
      const highContrastQuery = window.matchMedia("(prefers-contrast: high)");
      setState((prev) => ({
        ...prev,
        highContrast: highContrastQuery.matches,
      }));

      highContrastQuery.addEventListener("change", (e) => {
        setState((prev) => ({ ...prev, highContrast: e.matches }));
      });
    };

    const detectReducedMotion = () => {
      const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      setState((prev) => ({
        ...prev,
        reducedMotion: reducedMotionQuery.matches,
      }));

      reducedMotionQuery.addEventListener("change", (e) => {
        setState((prev) => ({ ...prev, reducedMotion: e.matches }));
      });
    };

    const detectFontSize = () => {
      // Detect user's font size preference
      const testElement = document.createElement("div");
      testElement.style.fontSize = "16px";
      testElement.style.position = "absolute";
      testElement.style.visibility = "hidden";
      document.body.appendChild(testElement);

      const computedSize = window.getComputedStyle(testElement).fontSize;
      const size = parseFloat(computedSize);

      let fontSize: AccessibilityState["fontSize"] = "normal";
      if (size < 14) fontSize = "small";
      else if (size > 18) fontSize = "large";
      else if (size > 22) fontSize = "extra-large";

      setState((prev) => ({ ...prev, fontSize }));
      document.body.removeChild(testElement);
    };

    detectScreenReader();
    detectHighContrast();
    detectReducedMotion();
    detectFontSize();
  }, []);

  // Create announcement area
  useEffect(() => {
    if (!announceRef.current) {
      const announcer = document.createElement("div");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.className = "sr-only";
      announcer.id = "pp-announcer";
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }

    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);

  // Announce messages to screen readers
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (announceRef.current) {
        announceRef.current.setAttribute("aria-live", priority);
        announceRef.current.textContent = message;

        // Clear after announcement
        setTimeout(() => {
          if (announceRef.current) {
            announceRef.current.textContent = "";
          }
        }, 1000);
      }

      setState((prev) => ({
        ...prev,
        announcements: [...prev.announcements, message].slice(-5), // Keep last 5
      }));
    },
    [],
  );

  // Focus management
  const setFocusVisible = useCallback((visible: boolean) => {
    setState((prev) => ({ ...prev, focusVisible: visible }));
  }, []);

  // Focus trap utility
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }, []);

  // Restore focus to previously focused element
  const restoreFocus = useCallback((element?: HTMLElement) => {
    const target = element || lastFocusedElement.current;
    if (target) {
      target.focus();
      lastFocusedElement.current = null;
    }
  }, []);

  // ARIA utilities
  const getAriaLabel = useCallback((base: string, context?: string) => {
    if (context) {
      return `${base}, ${context}`;
    }
    return base;
  }, []);

  const getAriaDescription = useCallback((description: string) => {
    return description;
  }, []);

  const generateId = useCallback((prefix: string = "pp") => {
    return `${prefix}-${++idCounter}`;
  }, []);

  // Color contrast validation (WCAG AA standard: 4.5:1)
  const validateColorContrast = useCallback(
    (foreground: string, background: string): boolean => {
      // Simple contrast check - in real app, use proper color contrast library
      // This is a simplified version for demonstration
      const getLuminance = (color: string): number => {
        // Convert hex to RGB and calculate luminance
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        const getLinear = (c: number) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        return (
          0.2126 * getLinear(r) + 0.7152 * getLinear(g) + 0.0722 * getLinear(b)
        );
      };

      const l1 = getLuminance(foreground);
      const l2 = getLuminance(background);
      const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

      return contrast >= 4.5; // WCAG AA standard
    },
    [],
  );

  // Accessibility audit
  const checkAccessibility = useCallback(
    (element: HTMLElement): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];

      // Check for missing alt text on images
      const images = element.querySelectorAll("img");
      images.forEach((img) => {
        if (!img.alt && !img.hasAttribute("aria-hidden")) {
          issues.push({
            type: "error",
            message: "Image missing alt text",
            element: img,
            fix: 'Add descriptive alt attribute or aria-hidden="true" for decorative images',
          });
        }
      });

      // Check for buttons without accessible names
      const buttons = element.querySelectorAll("button");
      buttons.forEach((button) => {
        const hasText = button.textContent?.trim();
        const hasAriaLabel = button.hasAttribute("aria-label");
        const hasAriaLabelledBy = button.hasAttribute("aria-labelledby");

        if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
          issues.push({
            type: "error",
            message: "Button missing accessible name",
            element: button,
            fix: "Add text content, aria-label, or aria-labelledby attribute",
          });
        }
      });

      // Check for form inputs without labels
      const inputs = element.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        const hasLabel = !!element.querySelector(`label[for="${input.id}"]`);
        const hasAriaLabel = input.hasAttribute("aria-label");
        const hasAriaLabelledBy = input.hasAttribute("aria-labelledby");

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
          issues.push({
            type: "error",
            message: "Form input missing label",
            element: input as HTMLElement,
            fix: "Add associated label element or aria-label attribute",
          });
        }
      });

      // Check for insufficient color contrast
      const textElements = element.querySelectorAll(
        "p, span, a, button, h1, h2, h3, h4, h5, h6",
      );
      textElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;

        if (
          color &&
          backgroundColor &&
          !validateColorContrast(color, backgroundColor)
        ) {
          issues.push({
            type: "warning",
            message: "Insufficient color contrast",
            element: el as HTMLElement,
            fix: "Increase contrast ratio to meet WCAG AA standards (4.5:1)",
          });
        }
      });

      return issues;
    },
    [validateColorContrast],
  );

  return {
    ...state,
    announce,
    setFocusVisible,
    trapFocus,
    restoreFocus,
    getAriaLabel,
    getAriaDescription,
    generateId,
    validateColorContrast,
    checkAccessibility,
  };
};
