import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4173'
const label = process.argv[3] ?? 'v2-live'
const root = resolve(import.meta.dirname, '..')
const verifyDir = resolve(root, '.verify')
await mkdir(verifyDir, { recursive: true })

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, executablePath })
const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]
const expectedTitles = [
  '에르메스 활동', '자동화', '공개 프로젝트', '지식 위키',
  '발행 기록', '에러와 복구', '에르메스의 학습',
]
const evidence = []
let failed = false

for (const testCase of cases) {
  const page = await browser.newPage({ viewport: testCase.viewport, deviceScaleFactor: 1 })
  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`))

  const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByTestId('editorial-footer').waitFor({ state: 'visible' })
  await page.waitForTimeout(1600)

  const books = page.getByTestId('book-mesh')
  const count = await books.count()
  const titles = await books.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-title')))
  const markerCount = await page.getByTestId('position-marker').count()
  const initialReaderCount = await page.getByTestId('reader').count()
  const initialInspectionCount = await page.getByTestId('inspection-mode').count()
  const initialTitle = await page.getByTestId('footer-title').textContent()

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(520)
  const nextTitle = await page.getByTestId('footer-title').textContent()
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(520)
  const previousTitle = await page.getByTestId('footer-title').textContent()

  const screenshot = resolve(verifyDir, `${label}-${testCase.name}.png`)
  await page.screenshot({ path: screenshot, fullPage: false })

  await page.getByRole('button', { name: 'OPEN' }).click()
  await page.getByTestId('inspection-mode').waitFor({ state: 'visible' })
  const inspectionTitle = await page.locator('#inspection-title').textContent()
  await page.keyboard.press('Escape')
  await page.getByTestId('inspection-mode').waitFor({ state: 'detached' })
  // The footer deliberately eases back from translateY(100%). Measure only
  // after that transition, otherwise mobile captures an in-flight +96px rect.
  await page.waitForTimeout(620)
  const closed = await page.getByTestId('inspection-mode').count() === 0

  const markerTarget = testCase.name === 'desktop' ? 5 : 2
  await page.getByTestId('position-marker').nth(markerTarget).click()
  await page.waitForTimeout(620)
  const markerTitle = await page.getByTestId('footer-title').textContent()
  await page.getByTestId('position-marker').nth(0).click()
  await page.waitForTimeout(620)
  const markerResetTitle = await page.getByTestId('footer-title').textContent()

  const footerMetrics = await page.getByTestId('editorial-footer').evaluate((node) => {
    const rect = node.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom, height: rect.height, scrollWidth: node.scrollWidth, viewportWidth: window.innerWidth }
  })

  const result = {
    viewport: testCase.viewport,
    httpStatus: response?.status(),
    bookCount: count,
    titles,
    markerCount,
    initialReaderCount,
    initialInspectionCount,
    initialTitle,
    nextTitle,
    previousTitle,
    inspectionTitle,
    markerTitle,
    markerResetTitle,
    closed,
    footerMetrics,
    consoleErrors,
    pageErrors,
    requestFailures,
    screenshot,
  }
  evidence.push(result)

  const mobileMetricsOk = testCase.name !== 'mobile' || (
    footerMetrics.height >= 190 && footerMetrics.height <= 255 &&
    footerMetrics.bottom <= testCase.viewport.height + 0.5 &&
    footerMetrics.scrollWidth <= footerMetrics.viewportWidth + 1
  )
  const ok = response?.status() === 200 && count === 7 && JSON.stringify(titles) === JSON.stringify(expectedTitles) &&
    markerCount === 7 && initialReaderCount === 0 && initialInspectionCount === 0 &&
    initialTitle === '에르메스 활동' && nextTitle === '자동화' && previousTitle === '에르메스 활동' &&
    inspectionTitle === '에르메스 활동' && markerTitle === expectedTitles[markerTarget] && markerResetTitle === '에르메스 활동' && closed && mobileMetricsOk &&
    consoleErrors.length === 0 && pageErrors.length === 0 && requestFailures.length === 0
  failed ||= !ok
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}/${testCase.name}`, JSON.stringify(result))
  await page.close()
}

await browser.close()
console.log(JSON.stringify({ label, baseURL, evidence }, null, 2))
if (failed) process.exit(1)
