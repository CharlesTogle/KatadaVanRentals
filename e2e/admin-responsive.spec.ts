import { expect, test } from '@playwright/test'

const session = {
  access_token: 'admin-token',
  refresh_token: 'admin-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: { full_name: 'Ada Admin' },
  },
}

test('admin dashboard keeps equal-width rows within the available content area', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 768 })

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
  })
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname

    if (path.endsWith('/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'admin-1', role: 'admin', is_active: true }),
      })
      return
    }

    if (path.endsWith('/bookings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'booking-1',
            status: 'confirmed',
            total_amount: 87590,
            created_at: new Date().toISOString(),
            vehicle_id: 'vehicle-1',
            profiles: { first_name: 'Alex', last_name: 'Customer' },
            vehicles: { name: 'Seed Commuter Deluxe' },
          },
        ]),
      })
      return
    }

    if (path.endsWith('/vehicles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'vehicle-1', name: 'Seed Commuter Deluxe', vehicle_type: 'Van', is_available: true },
        ]),
      })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })

  await page.goto('/login?redirect=%2Fadmin')
  await page.getByPlaceholder('you@example.com').fill(session.user.email)
  await page.getByPlaceholder('Enter your password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  for (const [width, expectedColumns] of [[1280, 3], [1024, 3], [768, 2], [639, 1]] as const) {
    await page.setViewportSize({ width, height: 768 })
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const layout = await page.locator('.admin-content').evaluate((element) => {
      const dashboardGrid = element.firstElementChild?.children[2]
      const cards = dashboardGrid ? Array.from(dashboardGrid.querySelectorAll<HTMLElement>('.card')) : []
      const rects = cards.map((card) => card.getBoundingClientRect())
      const contentRect = element.getBoundingClientRect()
      const rows = new Map<number, number[]>()

      for (const rect of rects) {
        const top = Math.round(rect.top)
        rows.set(top, [...(rows.get(top) || []), Math.round(rect.width)])
      }

      return {
        cardCount: cards.length,
        columns: dashboardGrid ? getComputedStyle(dashboardGrid).gridTemplateColumns.split(' ').length : 0,
        rowCounts: [...rows.values()].map((row) => row.length),
        rowWidths: [...rows.values()],
        contentRight: Math.round(contentRect.right),
        furthestCardRight: Math.round(Math.max(...rects.map((rect) => rect.right), contentRect.left)),
      }
    })

    expect(layout.cardCount).toBe(6)
    expect(layout.columns).toBe(expectedColumns)
    expect(layout.rowCounts).toEqual(Array.from({ length: Math.ceil(6 / expectedColumns) }, () => expectedColumns))
    expect(layout.rowWidths.every((row) => new Set(row).size === 1)).toBe(true)
    expect(layout.furthestCardRight).toBeLessThanOrEqual(layout.contentRight)
  }
})

test('revenue report keeps its summary and detail cards within responsive rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 768 })

  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
  })
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname

    if (path.endsWith('/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'admin-1', role: 'admin', is_active: true }),
      })
      return
    }

    if (path.endsWith('/rpc/get_revenue_report')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      return
    }

    if (path.endsWith('/annual_gross_sales')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      return
    }

    if (path.endsWith('/app_settings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tax_mode: 'unregistered' }) })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.goto('/login?redirect=%2Fadmin%2Freports%2Frevenue')
  await page.getByPlaceholder('you@example.com').fill(session.user.email)
  await page.getByPlaceholder('Enter your password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/admin/reports/revenue')
  await expect(page.getByRole('heading', { name: 'Revenue Report' })).toBeVisible()

  for (const [width, expectedColumns] of [[1280, 2], [1024, 2], [768, 2], [639, 1]] as const) {
    await page.setViewportSize({ width, height: 768 })
    await page.goto('/admin/reports/revenue')
    await expect(page.getByRole('heading', { name: 'Revenue Report' })).toBeVisible()

    const layout = await page.locator('.admin-revenue-grid').evaluate((element) => {
      const cards = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      const rects = cards.map((card) => card.getBoundingClientRect())
      const content = element.closest('.admin-content')?.getBoundingClientRect() || element.getBoundingClientRect()
      const rows = new Map<number, number[]>()

      for (const rect of rects) {
        const top = Math.round(rect.top)
        rows.set(top, [...(rows.get(top) || []), Math.round(rect.width)])
      }

      return {
        cardCount: cards.length,
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        gridWidth: Math.round(element.getBoundingClientRect().width),
        rowCounts: [...rows.values()].map((row) => row.length),
        rowWidths: [...rows.values()],
        contentRight: Math.round(content.right),
        furthestCardRight: Math.round(Math.max(...rects.map((rect) => rect.right), content.left)),
      }
    })

    expect(layout.cardCount).toBe(3)
    expect(layout.columns).toBe(expectedColumns)
    expect(layout.rowCounts).toEqual(width < 768 ? [1, 1, 1] : [2, 1])
    if (width < 768) {
      expect(layout.rowWidths.every((row) => row[0] === layout.gridWidth)).toBe(true)
    } else {
      expect(layout.rowWidths[0][0]).toBe(layout.rowWidths[0][1])
      expect(layout.rowWidths[1][0]).toBe(layout.gridWidth)
    }
    expect(layout.furthestCardRight).toBeLessThanOrEqual(layout.contentRight)
  }
})
