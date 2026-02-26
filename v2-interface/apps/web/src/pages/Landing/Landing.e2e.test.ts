import { expect, getTest } from 'playwright/fixtures'

const test = getTest()

test.describe(
  'Root Route',
  {
    tag: '@team:apps-growth',
    annotation: [
      { type: 'DD_TAGS[team]', description: 'apps-growth' },
      { type: 'DD_TAGS[test.type]', description: 'web-e2e' },
    ],
  },
  () => {
    test('root path does not render custom kasane page', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByText('Kasane Swap (Custom)')).toHaveCount(0)
    })

    test('blocked root path redirects to swap', async ({ page }) => {
      await page.route('/', async (route) => {
        const response = await route.fetch()
        const body = (await response.text()).replace('</head>', `<meta property="x:blocked-paths" content="/"></head>`)
        await route.fulfill({ status: response.status(), headers: response.headers(), body })
      })

      await page.goto('/')
      await expect(page).toHaveURL('/swap')
      await expect(page.getByText('Kasane Swap (Custom)')).toHaveCount(0)
    })
  },
)
