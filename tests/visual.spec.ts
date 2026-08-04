import { test, expect } from '@playwright/test'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const expectedTitles = [
  '에르메스 활동', '자동화', '공개 프로젝트', '지식 위키',
  '발행 기록', '에러와 복구', '에르메스의 학습',
]

test.use({ launchOptions: { executablePath: CHROME } })

test.describe('complete-shelf visual contract', () => {
  test('desktop exposes one cinematic seven-cover shelf and editorial chrome', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    const books = page.getByTestId('book-mesh')
    await expect(books).toHaveCount(7)
    const metadata = await books.evaluateAll((nodes) => nodes.map((node) => ({
      index: node.getAttribute('data-book-index'),
      title: node.getAttribute('data-title'),
      accent: node.getAttribute('data-accent'),
    })))
    expect(metadata.map(({ index }) => index)).toEqual(['0', '1', '2', '3', '4', '5', '6'])
    expect(metadata.map(({ title }) => title)).toEqual(expectedTitles)
    expect(metadata.every(({ accent }) => /^#[0-9a-f]{6}$/i.test(accent ?? ''))).toBe(true)

    await expect(page.getByTestId('masthead-left')).toBeVisible()
    await expect(page.getByTestId('edition-meta')).toBeVisible()
    await expect(page.getByTestId('editorial-footer')).toBeVisible()
    await expect(page.getByTestId('position-marker')).toHaveCount(7)
    await expect(page.getByRole('button', { name: 'OPEN' })).toBeVisible()
    await expect(page.getByRole('button', { name: '이전 책' })).toBeVisible()
    await expect(page.getByRole('button', { name: '다음 책' })).toBeVisible()

    await expect(page.getByTestId('reader')).toHaveCount(0)
    await expect(page.locator('.reader-card')).toHaveCount(0)
    await expect(page.getByTestId('inspection-mode')).toHaveCount(0)

    await expect(page.getByTestId('footer-title')).toHaveText('에르메스 활동')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('footer-title')).toHaveText('자동화')
    await expect(page.getByTestId('inspection-mode')).toHaveCount(0)

    await page.getByRole('button', { name: 'OPEN' }).click()
    await expect(page.getByTestId('inspection-mode')).toBeVisible()
    await expect(page.getByRole('button', { name: 'BACK' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('inspection-mode')).toHaveCount(0)
  })

  test('mobile keeps a compact, non-overflowing editorial footer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await expect(page.getByTestId('book-mesh')).toHaveCount(7)
    const footer = page.getByTestId('editorial-footer')
    await expect(footer).toBeVisible()
    await expect(page.getByTestId('position-marker')).toHaveCount(7)
    await expect(page.getByRole('button', { name: 'OPEN' })).toBeVisible()
    await expect(page.getByTestId('reader')).toHaveCount(0)

    const metrics = await footer.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        scrollWidth: node.scrollWidth,
        viewportWidth: window.innerWidth,
      }
    })
    expect(metrics.top).toBeGreaterThanOrEqual(0)
    expect(metrics.bottom).toBeLessThanOrEqual(844.5)
    expect(metrics.height).toBeGreaterThanOrEqual(190)
    expect(metrics.height).toBeLessThanOrEqual(255)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  })
})
