import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CLS_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const threshold = Number(process.env.CLS_THRESHOLD || 0.1);
const routes = (process.env.CLS_ROUTES || '/,/leaderboard')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const screenshotDir = process.env.CLS_SCREENSHOT_DIR || '';

const viewports = [
  { name: 'desktop', width: 1365, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

function screenshotPath(route, viewportName, phase) {
  const routeSlug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  return path.join(screenshotDir, `${viewportName}-${routeSlug}-${phase}.png`);
}

if (!Number.isFinite(threshold) || threshold <= 0) {
  throw new Error(`Invalid CLS_THRESHOLD: ${process.env.CLS_THRESHOLD}`);
}

if (screenshotDir) {
  await mkdir(screenshotDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.addInitScript(() => {
        window.__polywhaleClsValue = 0;
        window.__polywhaleClsEntries = [];
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__polywhaleClsValue += entry.value;
            window.__polywhaleClsEntries.push({
              value: entry.value,
              startTime: entry.startTime,
              sources: entry.sources?.map((source) => ({
                node: source.node?.outerHTML?.slice(0, 180) || '',
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })) || [],
            });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });

      const url = new URL(route, baseUrl).toString();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      if (screenshotDir) {
        await page.screenshot({ path: screenshotPath(route, viewport.name, 'initial'), fullPage: false });
      }
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
      await page.waitForTimeout(3_000);

      const measurement = await page.evaluate(() => ({
        value: window.__polywhaleClsValue || 0,
        entries: window.__polywhaleClsEntries || [],
      }));

      if (screenshotDir) {
        await page.screenshot({ path: screenshotPath(route, viewport.name, 'hydrated'), fullPage: false });
      }

      results.push({
        route,
        viewport: viewport.name,
        cls: Number(measurement.value.toFixed(4)),
        entries: measurement.entries.length,
        worstEntry: measurement.entries
          .sort((a, b) => b.value - a.value)
          .slice(0, 1),
      });

      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseUrl, threshold, results }, null, 2));

const failures = results.filter((result) => result.cls > threshold);
if (failures.length > 0) {
  throw new Error(
    `CLS threshold exceeded: ${failures
      .map((result) => `${result.route} ${result.viewport}=${result.cls}`)
      .join(', ')}`
  );
}
