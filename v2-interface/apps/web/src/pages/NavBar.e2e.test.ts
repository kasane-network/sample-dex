import { expect, getTest } from 'playwright/fixtures'

const test = getTest()

test.describe(
  'NavBar',
  {
    tag: '@team:apps-infra',
    annotation: [
      { type: 'DD_TAGS[team]', description: 'apps-infra' },
      { type: 'DD_TAGS[test.type]', description: 'web-e2e' },
    ],
  },
  () => {
    test('trade tab can navigate to swap', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('Trade-tab').locator('a').click()
      await expect(page).toHaveURL('/swap')
    })
  },
)
