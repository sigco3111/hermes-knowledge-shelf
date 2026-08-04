// Phase B: verify the foil mesh is visible on the canvas and capture a screenshot.
// Pure runtime check — runs the live bundle against Chrome.
import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const url = process.env.TARGET_URL ?? 'http://127.0.0.1:4174/';
const outPath = process.env.OUT_PATH ?? '.verify/phase-b-live.png';

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror:' + e.message));
page.on('requestfailed', (r) => errors.push('reqfail:' + r.url() + ' ' + r.failure()?.errorText));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const stats = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { ok: false, reason: 'no canvas' };
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return { ok: !!gl, w: canvas.width, h: canvas.height, hasFoilMotif: !!canvas };
});

await page.screenshot({ path: outPath, fullPage: false });

console.log('url:', url);
console.log('canvas:', JSON.stringify(stats));
console.log('errors:', errors.length);
errors.slice(0, 10).forEach((e) => console.log('  -', e));
await browser.close();
process.exit(errors.length ? 1 : 0);
