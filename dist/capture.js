import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
const SCREENSHOT_DIR = process.env.UX_REVIEW_SCREENSHOT_DIR ?? join(homedir(), '.ux-review', 'screenshots');
const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
const getExecutablePath = () => {
    return process.env.CHROME_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
};
const ensureScreenshotDir = async () => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
};
const launchBrowser = async () => {
    const { chromium } = await import('playwright-core');
    const executablePath = getExecutablePath();
    return chromium.launch({
        headless: true,
        executablePath
    });
};
export const captureWebUrlScreenshot = async (url) => {
    await ensureScreenshotDir();
    const filePath = join(SCREENSHOT_DIR, `web_${nowStamp()}.png`);
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.screenshot({ path: filePath, fullPage: true });
        return filePath;
    }
    finally {
        await browser.close();
    }
};
export const captureHtmlScreenshot = async (html) => {
    await ensureScreenshotDir();
    const filePath = join(SCREENSHOT_DIR, `html_${nowStamp()}.png`);
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 15000 });
        await page.screenshot({ path: filePath, fullPage: true });
        return filePath;
    }
    finally {
        await browser.close();
    }
};
export const persistInlineImage = async (base64Png) => {
    await ensureScreenshotDir();
    const filePath = join(SCREENSHOT_DIR, `inline_${nowStamp()}.png`);
    const cleaned = base64Png.replace(/^data:image\/png;base64,/, '');
    await writeFile(filePath, Buffer.from(cleaned, 'base64'));
    return filePath;
};
