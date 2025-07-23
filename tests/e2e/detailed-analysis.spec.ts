/**
 * Detailed PersonaPass Frontend Analysis
 * Deep dive into UI elements, accessibility, and performance
 */

import { test, expect } from "@playwright/test";
import { writeFile } from "fs/promises";
import path from "path";

test.describe("PersonaPass Detailed Frontend Analysis", () => {
  test("Comprehensive UI and Content Analysis", async ({ page }) => {
    console.log("🔍 Performing detailed UI and content analysis...");

    await page.goto("http://localhost:3000");
    await page.waitForTimeout(3000); // Wait for full load

    // Analyze page structure
    const pageStructure = await page.evaluate(() => {
      const structure = {
        title: document.title,
        headings: Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
        ).map((h) => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim() || "",
          id: h.id || null,
        })),
        buttons: Array.from(document.querySelectorAll("button")).map((btn) => ({
          text: btn.textContent?.trim() || "",
          disabled: btn.disabled,
          type: btn.type || "button",
        })),
        links: Array.from(document.querySelectorAll("a")).map((link) => ({
          text: link.textContent?.trim() || "",
          href: link.href || null,
          target: link.target || null,
        })),
        forms: Array.from(document.querySelectorAll("form")).map((form) => ({
          method: form.method || "get",
          action: form.action || null,
          inputs: Array.from(form.querySelectorAll("input")).length,
        })),
        images: Array.from(document.querySelectorAll("img")).map((img) => ({
          src: img.src || null,
          alt: img.alt || null,
          width: img.width,
          height: img.height,
        })),
        textContent: document.body.textContent || "",
      };

      return structure;
    });

    // Analyze color scheme and design
    const designAnalysis = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);

      // Get all colors used
      const elements = document.querySelectorAll("*");
      const colors = {
        backgrounds: new Set(),
        texts: new Set(),
        borders: new Set(),
      };

      Array.from(elements).forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
          colors.backgrounds.add(style.backgroundColor);
        }
        if (style.color) {
          colors.texts.add(style.color);
        }
        if (style.borderColor && style.borderColor !== "rgba(0, 0, 0, 0)") {
          colors.borders.add(style.borderColor);
        }
      });

      // Check for modern design patterns
      const modernDesign = {
        flexbox: Array.from(elements).some(
          (el) => window.getComputedStyle(el).display === "flex",
        ),
        grid: Array.from(elements).some(
          (el) => window.getComputedStyle(el).display === "grid",
        ),
        shadows: Array.from(elements).some(
          (el) => window.getComputedStyle(el).boxShadow !== "none",
        ),
        borderRadius: Array.from(elements).some(
          (el) => window.getComputedStyle(el).borderRadius !== "0px",
        ),
        transitions: Array.from(elements).some(
          (el) => window.getComputedStyle(el).transition !== "all 0s ease 0s",
        ),
      };

      return {
        bodyBackground: computedStyle.backgroundColor,
        bodyColor: computedStyle.color,
        bodyFont: computedStyle.fontFamily,
        colors: {
          backgrounds: Array.from(colors.backgrounds),
          texts: Array.from(colors.texts),
          borders: Array.from(colors.borders),
        },
        modernDesign,
      };
    });

    // Check accessibility attributes
    const accessibilityAnalysis = await page.evaluate(() => {
      const accessibility = {
        ariaLabels: document.querySelectorAll("[aria-label]").length,
        ariaLabelledBy: document.querySelectorAll("[aria-labelledby]").length,
        ariaDescribedBy: document.querySelectorAll("[aria-describedby]").length,
        ariaRoles: document.querySelectorAll("[role]").length,
        ariaLive: document.querySelectorAll("[aria-live]").length,
        ariaHidden: document.querySelectorAll("[aria-hidden]").length,
        landmarks: {
          main: document.querySelectorAll("main").length,
          nav: document.querySelectorAll("nav").length,
          header: document.querySelectorAll("header").length,
          footer: document.querySelectorAll("footer").length,
          section: document.querySelectorAll("section").length,
          article: document.querySelectorAll("article").length,
          aside: document.querySelectorAll("aside").length,
        },
        skipLinks: document.querySelectorAll('a[href^="#"]').length,
        focusableElements: document.querySelectorAll(
          "button, input, select, textarea, a[href], [tabindex]",
        ).length,
      };

      return accessibility;
    });

    // Performance analysis
    const performanceAnalysis = await page.evaluate(() => {
      const performance = window.performance;
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");

      const resourcesByType = resources.reduce((acc, resource) => {
        const type = resource.name.split(".").pop() || "unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          name: resource.name,
          size: resource.transferSize,
          duration: resource.duration,
        });
        return acc;
      }, {});

      return {
        domContentLoaded:
          navigation?.domContentLoadedEventEnd -
          navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        totalResources: resources.length,
        totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        resourcesByType,
      };
    });

    // Create comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      url: "http://localhost:3000",
      pageStructure,
      designAnalysis,
      accessibilityAnalysis,
      performanceAnalysis,
      analysis: {
        professionalDesign: {
          score: 0,
          issues: [],
          strengths: [],
        },
        accessibility: {
          score: 0,
          issues: [],
          strengths: [],
        },
        performance: {
          score: 0,
          issues: [],
          strengths: [],
        },
      },
    };

    // Analyze professional design
    if (
      designAnalysis.modernDesign.flexbox ||
      designAnalysis.modernDesign.grid
    ) {
      report.analysis.professionalDesign.strengths.push(
        "Uses modern CSS layout systems",
      );
      report.analysis.professionalDesign.score += 20;
    }

    if (designAnalysis.modernDesign.shadows) {
      report.analysis.professionalDesign.strengths.push(
        "Uses box shadows for depth",
      );
      report.analysis.professionalDesign.score += 10;
    }

    if (designAnalysis.modernDesign.borderRadius) {
      report.analysis.professionalDesign.strengths.push("Uses rounded corners");
      report.analysis.professionalDesign.score += 10;
    }

    if (designAnalysis.modernDesign.transitions) {
      report.analysis.professionalDesign.strengths.push("Uses CSS transitions");
      report.analysis.professionalDesign.score += 15;
    }

    // Check for orange accents
    const hasOrangeAccents =
      designAnalysis.colors.backgrounds.some(
        (color) =>
          color.includes("orange") ||
          color.includes("rgb(255, 165, 0)") ||
          color.includes("rgb(255, 140, 0)"),
      ) ||
      designAnalysis.colors.texts.some(
        (color) =>
          color.includes("orange") ||
          color.includes("rgb(255, 165, 0)") ||
          color.includes("rgb(255, 140, 0)"),
      );

    if (hasOrangeAccents) {
      report.analysis.professionalDesign.strengths.push(
        "Uses orange accent colors as specified",
      );
      report.analysis.professionalDesign.score += 15;
    } else {
      report.analysis.professionalDesign.issues.push(
        "No orange accent colors detected",
      );
    }

    // Check for blue/purple clichés
    const hasBlueElements = designAnalysis.colors.backgrounds.some(
      (color) =>
        color.includes("blue") ||
        color.includes("rgb(0, 0, 255)") ||
        color.includes("rgb(0, 123, 255)"),
    );

    const hasPurpleElements = designAnalysis.colors.backgrounds.some(
      (color) =>
        color.includes("purple") ||
        color.includes("rgb(128, 0, 128)") ||
        color.includes("rgb(102, 51, 153)"),
    );

    if (hasBlueElements || hasPurpleElements) {
      report.analysis.professionalDesign.issues.push(
        "Uses blue/purple color clichés",
      );
      report.analysis.professionalDesign.score -= 10;
    }

    // Analyze accessibility
    if (accessibilityAnalysis.landmarks.main > 0) {
      report.analysis.accessibility.strengths.push("Has main landmark");
      report.analysis.accessibility.score += 15;
    } else {
      report.analysis.accessibility.issues.push("Missing main landmark");
    }

    if (accessibilityAnalysis.landmarks.nav > 0) {
      report.analysis.accessibility.strengths.push("Has navigation landmark");
      report.analysis.accessibility.score += 10;
    } else {
      report.analysis.accessibility.issues.push("Missing navigation landmark");
    }

    if (accessibilityAnalysis.ariaLabels > 0) {
      report.analysis.accessibility.strengths.push("Uses ARIA labels");
      report.analysis.accessibility.score += 15;
    } else {
      report.analysis.accessibility.issues.push("No ARIA labels found");
    }

    if (accessibilityAnalysis.focusableElements > 0) {
      report.analysis.accessibility.strengths.push("Has focusable elements");
      report.analysis.accessibility.score += 10;
    }

    // Analyze performance
    if (performanceAnalysis.totalSize < 2000000) {
      // 2MB
      report.analysis.performance.strengths.push("Reasonable bundle size");
      report.analysis.performance.score += 20;
    } else {
      report.analysis.performance.issues.push("Large bundle size");
    }

    if (performanceAnalysis.domContentLoaded < 1000) {
      report.analysis.performance.strengths.push("Fast DOM loading");
      report.analysis.performance.score += 15;
    }

    if (performanceAnalysis.loadComplete < 2000) {
      report.analysis.performance.strengths.push("Fast page load");
      report.analysis.performance.score += 15;
    }

    // Save detailed report
    await writeFile(
      path.join(process.cwd(), "test-results", "detailed-analysis.json"),
      JSON.stringify(report, null, 2),
    );

    // Console summary
    console.log("\n📊 PersonaPass Detailed Analysis Summary");
    console.log("=".repeat(60));
    console.log(
      `Professional Design Score: ${report.analysis.professionalDesign.score}/100`,
    );
    console.log(
      `Accessibility Score: ${report.analysis.accessibility.score}/100`,
    );
    console.log(`Performance Score: ${report.analysis.performance.score}/100`);
    console.log(
      `Total Content Length: ${pageStructure.textContent.length} characters`,
    );
    console.log(`Buttons: ${pageStructure.buttons.length}`);
    console.log(`Links: ${pageStructure.links.length}`);
    console.log(`Images: ${pageStructure.images.length}`);
    console.log(`Forms: ${pageStructure.forms.length}`);
    console.log("=".repeat(60));

    expect(report.analysis.professionalDesign.score).toBeGreaterThan(0);
    expect(report.analysis.accessibility.score).toBeGreaterThan(0);
    expect(report.analysis.performance.score).toBeGreaterThan(0);
  });
});
