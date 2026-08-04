import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4173'
const label = process.argv[3] ?? 'dev'
const root = resolve(import.meta.dirname, '..')
const verifyDir = resolve(root, '.verify')
await mkdir(verifyDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]
const evidence = []
let failed = false

for (const testCase of cases) {
  const page = await browser.newPage({ viewport: testCase.viewport, deviceScaleFactor: 1 })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator('canvas').waitFor({ state: 'visible' })
  await page.waitForTimeout(1200)
  const spines = page.getByTestId('book-spine')
  const count = await spines.count()
  const titles = await spines.allTextContents()
  const canvas = await page.locator('canvas').evaluate((node) => ({
    clientWidth: node.clientWidth, clientHeight: node.clientHeight,
    width: node.width, height: node.height,
  }))

  await spines.nth(0).click()
  const reader = page.getByTestId('reader')
  await reader.waitFor({ state: 'visible' })
  const firstTitle = await page.locator('#reader-title').textContent()
  await page.keyboard.press('ArrowRight')
  const nextTitle = await page.locator('#reader-title').textContent()
  await page.keyboard.press('ArrowLeft')
  const previousTitle = await page.locator('#reader-title').textContent()
  const screenshot = resolve(verifyDir, `${label}-${testCase.name}.png`)
  await page.screenshot({ path: screenshot, fullPage: false })
  await page.keyboard.press('Escape')
  const closed = await reader.count() === 0

  const result = {
    viewport: testCase.viewport,
    httpStatus: response?.status(),
    bookCount: count,
    titles: titles.map((value) => value.replace(/^\d+/, '').trim()),
    canvas,
    firstTitle,
    nextTitle,
    previousTitle,
    closed,
    consoleErrors,
    pageErrors,
    screenshot,
  }
  evidence.push(result)
  const ok = response?.status() === 200 && count === 7 && firstTitle === '에르메스 활동' &&
    nextTitle === '자동화' && previousTitle === '에르메스 활동' && closed &&
    consoleErrors.length === 0 && pageErrors.length === 0
  failed ||= !ok
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}/${testCase.name}`, JSON.stringify(result))
  await page.close()
}

await browser.close()
console.log(JSON.stringify({ label, baseURL, evidence }, null, 2))
if (failed) process.exit(1)
