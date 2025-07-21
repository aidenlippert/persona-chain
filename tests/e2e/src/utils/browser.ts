import puppeteer, { Browser, Page } from 'puppeteer';

export interface BrowserConfig {
  headless?: boolean;
  devtools?: boolean;
  slowMo?: number;
  viewport?: {
    width: number;
    height: number;
  };
}

export class BrowserManager {
  private browser: Browser | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      devtools: false,
      slowMo: 0,
      viewport: { width: 1280, height: 720 },
      ...config,
    };
  }

  async launch(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      devtools: this.config.devtools,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    return this.browser;
  }

  async createPage(): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage();
    
    if (this.config.viewport) {
      await page.setViewport(this.config.viewport);
    }

    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (process.env.DEBUG_BROWSER) {
        console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
      }
    });

    // Set up error handling
    page.on('pageerror', (error) => {
      console.error('🚨 Page Error:', error.message);
    });

    page.on('requestfailed', (request) => {
      if (process.env.DEBUG_BROWSER) {
        console.log('❌ Request Failed:', request.url(), request.failure()?.errorText);
      }
    });

    return page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async takeScreenshot(page: Page, name: string): Promise<void> {
    if (process.env.SCREENSHOTS === 'true') {
      const timestamp = Date.now();
      await page.screenshot({
        path: `./screenshots/${timestamp}-${name}.png`,
        fullPage: true,
      });
    }
  }

  async waitForSelector(page: Page, selector: string, timeout = 5000): Promise<void> {
    try {
      await page.waitForSelector(selector, { timeout });
    } catch (error) {
      await this.takeScreenshot(page, `timeout-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
      throw error;
    }
  }

  async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      await this.waitForSelector(page, selector);
      await page.type(selector, value);
    }
  }

  async clickAndWaitForNavigation(page: Page, selector: string): Promise<void> {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(selector),
    ]);
  }

  async getText(page: Page, selector: string): Promise<string> {
    await this.waitForSelector(page, selector);
    return page.$eval(selector, (el) => el.textContent?.trim() || '');
  }

  async getAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    await this.waitForSelector(page, selector);
    return page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
  }

  async isElementVisible(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForText(page: Page, selector: string, expectedText: string, timeout = 5000): Promise<void> {
    await page.waitForFunction(
      (sel, text) => {
        const element = document.querySelector(sel);
        return element && element.textContent?.includes(text);
      },
      { timeout },
      selector,
      expectedText
    );
  }
}