import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const resolveScreenshotDir = (): string =>
  process.env.UX_REVIEW_SCREENSHOT_DIR ??
  (process.env.VERCEL
    ? join(tmpdir(), 'ux-review', 'screenshots')
    : join(homedir(), '.ux-review', 'screenshots'));

const nowStamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');

const getExecutablePath = (): string | undefined => {
  return process.env.CHROME_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
};

const ensureScreenshotDir = async (): Promise<void> => {
  await mkdir(resolveScreenshotDir(), { recursive: true });
};

const launchBrowser = async () => {
  const { chromium } = await import('playwright-core');
  const executablePath = getExecutablePath();
  return chromium.launch({
    headless: true,
    executablePath
  });
};

export const captureWebUrlScreenshot = async (url: string): Promise<string> => {
  await ensureScreenshotDir();
  const filePath = join(resolveScreenshotDir(), `web_${nowStamp()}.png`);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } finally {
    await browser.close();
  }
};

export const captureHtmlScreenshot = async (html: string): Promise<string> => {
  await ensureScreenshotDir();
  const filePath = join(resolveScreenshotDir(), `html_${nowStamp()}.png`);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } finally {
    await browser.close();
  }
};

export const persistInlineImage = async (base64Png: string): Promise<string> => {
  await ensureScreenshotDir();
  const filePath = join(resolveScreenshotDir(), `inline_${nowStamp()}.png`);
  const cleaned = base64Png.replace(/^data:image\/png;base64,/, '');
  await writeFile(filePath, Buffer.from(cleaned, 'base64'));
  return filePath;
};
