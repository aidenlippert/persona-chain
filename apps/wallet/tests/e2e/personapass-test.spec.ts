/**
 * PersonaPass Frontend Testing - Comprehensive Analysis
 * Tests UI, functionality, performance, and accessibility
 */

import { test, expect } from "@playwright/test";
import { writeFile } from "fs/promises";
import path from "path";

// Test configuration
const TEST_URL = "https://personapass.xyz";
const BLOCKCHAIN_URL = "http://34.60.89.162:26657";

// Results tracking
let testResults = {
  timestamp: new Date().toISOString(),
  url: TEST_URL,
  blockchain_url: BLOCKCHAIN_URL,
  connection_status: "UNKNOWN",
  ui_tests: {},
  functionality_tests: {},
  performance_tests: {},
  accessibility_tests: {},
  screenshots: [],
  issues: [],
  recommendations: [],
};

test.describe("PersonaPass Frontend Comprehensive Testing", () => {
  test("1. Basic Connectivity and Load Performance", async ({ page }) => {
    console.log("🚀 Testing basic connectivity and performance...");

    const startTime = Date.now();

    try {
      const response = await page.goto(TEST_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      const loadTime = Date.now() - startTime;

      testResults.performance_tests.initial_load_time = loadTime;
      testResults.connection_status =
        response?.status() === 200 || response?.status() === 304
          ? "SUCCESS"
          : "FAILED";

      console.log(`✅ Frontend accessible in ${loadTime}ms`);

      // Test performance thresholds
      if (loadTime > 3000) {
        testResults.issues.push(
          `Slow load time: ${loadTime}ms (should be < 3000ms)`,
        );
      }

      // Get page title
      const title = await page.title();
      testResults.ui_tests.page_title = title;

      // Take initial screenshot
      await page.screenshot({
        path: "test-results/personapass-initial.png",
        fullPage: true,
      });
      testResults.screenshots.push("personapass-initial.png");

      // Check if React is loaded
      const reactLoaded = await page.evaluate(
        () => typeof window.React !== "undefined",
      );
      testResults.ui_tests.react_loaded = reactLoaded;

      expect(response?.status()).toBeGreaterThanOrEqual(200);
      expect(response?.status()).toBeLessThan(400);
    } catch (error) {
      testResults.connection_status = "ERROR";
      testResults.issues.push(`Connection error: ${error.message}`);
      throw error;
    }
  });

  test("2. Beautiful UI Design and Responsiveness", async ({ page }) => {
    console.log("🎨 Testing UI design and responsiveness...");

    await page.goto(TEST_URL);

    // Check body background color
    const backgroundColor = await page
      .locator("body")
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);
    testResults.ui_tests.background_color = backgroundColor;

    // Check for orange accents (as specified in requirements)
    const orangeElements = await page
      .locator('[class*="orange"], [style*="orange"]')
      .count();
    testResults.ui_tests.orange_accents = orangeElements;

    // Check for blue/purple clichés (should be avoided)
    const blueElements = await page
      .locator('[class*="blue"], [style*="blue"]')
      .count();
    const purpleElements = await page
      .locator('[class*="purple"], [style*="purple"]')
      .count();
    testResults.ui_tests.blue_elements = blueElements;
    testResults.ui_tests.purple_elements = purpleElements;

    if (blueElements > orangeElements || purpleElements > orangeElements) {
      testResults.issues.push(
        "Too many blue/purple elements - should use orange accents instead",
      );
    }

    // Test responsive design across viewports
    const viewports = [
      { width: 1920, height: 1080, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 375, height: 667, name: "mobile" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      // Check if content fits viewport
      const hasHorizontalScroll = await page.evaluate(
        () => document.body.scrollWidth > window.innerWidth,
      );

      testResults.ui_tests[`responsive_${viewport.name}`] =
        !hasHorizontalScroll;

      if (hasHorizontalScroll) {
        testResults.issues.push(
          `Horizontal scroll detected on ${viewport.name}`,
        );
      }

      // Take screenshot
      await page.screenshot({
        path: `test-results/personapass-${viewport.name}.png`,
        fullPage: true,
      });
      testResults.screenshots.push(`personapass-${viewport.name}.png`);
    }

    // Check for smooth animations
    const animationElements = await page
      .locator('[class*="transition"], [class*="animate"]')
      .count();
    testResults.ui_tests.animation_elements = animationElements;

    if (animationElements === 0) {
      testResults.recommendations.push(
        "Consider adding CSS transitions for smoother user experience",
      );
    }

    console.log("✅ UI design testing completed");
  });

  test("3. Core Functionality Testing", async ({ page }) => {
    console.log("⚡ Testing core functionality...");

    await page.goto(TEST_URL);
    await page.waitForTimeout(2000);

    // Test blockchain connectivity indicator
    const blockchainConnected = await page
      .locator('text="PersonaChain is running"')
      .isVisible();
    testResults.functionality_tests.blockchain_connectivity =
      blockchainConnected;

    if (!blockchainConnected) {
      testResults.issues.push("Blockchain connectivity indicator not visible");
    }

    // Test wallet connection functionality
    const walletButtons = await page
      .locator('button:has-text("Connect"), button:has-text("Wallet")')
      .count();
    testResults.functionality_tests.wallet_buttons = walletButtons;

    if (walletButtons > 0) {
      const walletButton = page
        .locator('button:has-text("Connect"), button:has-text("Wallet")')
        .first();
      await walletButton.click();
      await page.waitForTimeout(1000);

      // Check for modal or wallet connection UI
      const modalVisible = await page
        .locator('[role="dialog"], .modal, [class*="modal"]')
        .isVisible();
      testResults.functionality_tests.wallet_modal = modalVisible;
    }

    // Test DID creation functionality
    const didButtons = await page
      .locator(
        'button:has-text("Create"), button:has-text("Generate"), button:has-text("DID")',
      )
      .count();
    testResults.functionality_tests.did_buttons = didButtons;

    // Test navigation
    const navLinks = await page.locator('nav a, [role="navigation"] a').count();
    testResults.functionality_tests.navigation_links = navLinks;

    if (navLinks === 0) {
      testResults.issues.push("No navigation links detected");
    }

    // Test for loading states
    const loadingElements = await page
      .locator('[class*="loading"], [class*="spinner"], [class*="pulse"]')
      .count();
    testResults.functionality_tests.loading_states = loadingElements;

    console.log("✅ Functionality testing completed");
  });

  test("4. Performance Metrics", async ({ page }) => {
    console.log("🚀 Testing performance metrics...");

    // Test Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};

        // Check if PerformanceObserver is available
        if (typeof PerformanceObserver !== "undefined") {
          // Largest Contentful Paint
          try {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                vitals.lcp = entries[entries.length - 1].startTime;
              }
            }).observe({ type: "largest-contentful-paint", buffered: true });
          } catch (e) {
            vitals.lcp_error = e.message;
          }

          // Cumulative Layout Shift
          try {
            new PerformanceObserver((list) => {
              let cls = 0;
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  cls += entry.value;
                }
              }
              vitals.cls = cls;
            }).observe({ type: "layout-shift", buffered: true });
          } catch (e) {
            vitals.cls_error = e.message;
          }
        }

        setTimeout(() => resolve(vitals), 2000);
      });
    });

    testResults.performance_tests.web_vitals = webVitals;

    // Test resource loading
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource");
      const totalSize = resources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);

      return {
        totalSize,
        resourceCount: resources.length,
      };
    });

    testResults.performance_tests.resource_metrics = resourceSizes;

    if (resourceSizes.totalSize > 2000000) {
      // 2MB
      testResults.issues.push(
        `Large bundle size: ${Math.round(resourceSizes.totalSize / 1024)}KB`,
      );
    }

    console.log("✅ Performance testing completed");
  });

  test("5. Accessibility Testing", async ({ page }) => {
    console.log("♿ Testing accessibility features...");

    await page.goto(TEST_URL);

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    const focusedElement = await page.locator(":focus").isVisible();
    testResults.accessibility_tests.keyboard_navigation = focusedElement;

    if (!focusedElement) {
      testResults.issues.push(
        "No keyboard focus detected - keyboard navigation may be broken",
      );
    }

    // Test semantic HTML structure
    const semanticElements = {
      headings: await page.locator("h1, h2, h3, h4, h5, h6").count(),
      landmarks: await page
        .locator("main, nav, section, article, aside, header, footer")
        .count(),
      lists: await page.locator("ul, ol").count(),
      buttons: await page.locator("button").count(),
      links: await page.locator("a").count(),
    };

    testResults.accessibility_tests.semantic_elements = semanticElements;

    // Test ARIA attributes
    const ariaElements = {
      labels: await page.locator("[aria-label], [aria-labelledby]").count(),
      roles: await page.locator("[role]").count(),
      live: await page.locator("[aria-live]").count(),
      hidden: await page.locator("[aria-hidden]").count(),
    };

    testResults.accessibility_tests.aria_elements = ariaElements;

    if (semanticElements.headings === 0) {
      testResults.issues.push("No semantic headings found");
    }

    if (semanticElements.landmarks === 0) {
      testResults.issues.push("No semantic landmarks found");
    }

    // Test for alt text on images
    const images = await page.locator("img").count();
    const imagesWithAlt = await page.locator("img[alt]").count();

    testResults.accessibility_tests.images = {
      total: images,
      withAlt: imagesWithAlt,
    };

    if (images > 0 && imagesWithAlt < images) {
      testResults.issues.push(
        `${images - imagesWithAlt} images missing alt text`,
      );
    }

    console.log("✅ Accessibility testing completed");
  });

  test.afterAll(async () => {
    // Calculate overall score
    const scores = {
      connectivity: testResults.connection_status === "SUCCESS" ? 25 : 0,
      ui_responsive:
        Object.values(testResults.ui_tests).filter((v) => v === true).length *
        5,
      functionality:
        Object.values(testResults.functionality_tests).filter((v) => v === true)
          .length * 5,
      performance:
        (testResults.performance_tests.initial_load_time || 0) < 3000 ? 20 : 0,
      accessibility: testResults.accessibility_tests.keyboard_navigation
        ? 15
        : 0,
    };

    testResults.overall_score = Math.min(
      100,
      Object.values(scores).reduce((sum, score) => sum + score, 0),
    );

    // Save comprehensive results
    try {
      await writeFile(
        path.join(
          process.cwd(),
          "test-results",
          "comprehensive-test-results.json",
        ),
        JSON.stringify(testResults, null, 2),
      );

      console.log("\n📊 PersonaPass Frontend Test Results Summary");
      console.log("=".repeat(60));
      console.log(`Overall Score: ${testResults.overall_score}/100`);
      console.log(`Connection Status: ${testResults.connection_status}`);
      console.log(
        `Load Time: ${testResults.performance_tests.initial_load_time}ms`,
      );
      console.log(`Screenshots: ${testResults.screenshots.length} captured`);
      console.log(`Issues Found: ${testResults.issues.length}`);
      console.log(`Recommendations: ${testResults.recommendations.length}`);
      console.log("=".repeat(60));

      if (testResults.issues.length > 0) {
        console.log("\n🚨 Issues Found:");
        testResults.issues.forEach((issue, i) =>
          console.log(`${i + 1}. ${issue}`),
        );
      }

      if (testResults.recommendations.length > 0) {
        console.log("\n💡 Recommendations:");
        testResults.recommendations.forEach((rec, i) =>
          console.log(`${i + 1}. ${rec}`),
        );
      }
    } catch (error) {
      console.error("Error saving results:", error);
    }
  });
});
