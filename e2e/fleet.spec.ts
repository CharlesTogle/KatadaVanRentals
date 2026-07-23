import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

test.describe('Admin Fleet', () => {
  test.beforeEach(async ({ page }) => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip(true, 'Set TEST_EMAIL and TEST_PASSWORD env vars')
      return
    }

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Your password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL(/\/admin/)
  })

  test('shows fleet table with vehicles', async ({ page }) => {
    await page.goto('/admin/fleet')
    await expect(page.getByRole('heading', { name: 'Our Fleet' })).toBeVisible()
  })

  test('navigates to add vehicle page', async ({ page }) => {
    await page.goto('/admin/fleet')
    await page.getByRole('button', { name: 'Add Vehicle' }).click()
    await expect(page).toHaveURL('/admin/fleet/new')
    await expect(page.getByRole('heading', { name: 'Add New Vehicle' })).toBeVisible()
  })

  test('add vehicle form has all sections', async ({ page }) => {
    await page.goto('/admin/fleet/new')

    await expect(page.getByText('Basic Information')).toBeVisible()
    await expect(page.getByText('Vehicle Rate')).toBeVisible()
    await expect(page.getByText('Additional Fees')).toBeVisible()
    await expect(page.getByText('Discount')).toBeVisible()
    await expect(page.getByText('Other Settings')).toBeVisible()
    await expect(page.getByText('Vehicle Image')).toBeVisible()
  })

  test('validates required fields on empty submit', async ({ page }) => {
    await page.goto('/admin/fleet/new')
    await page.getByRole('button', { name: 'Add Vehicle' }).click()
    await expect(page.getByText('Vehicle Name is required.')).toBeVisible()
  })

  test('creates and deletes a vehicle', async ({ page }) => {
    const plate = `E2E${Date.now().toString(36).toUpperCase().slice(-6)}`

    await page.goto('/admin/fleet/new')

    await page.getByPlaceholder('e.g. Commuter Deluxe').fill(`E2E Test ${plate}`)
    await page.getByPlaceholder('e.g. NBS4512').fill(plate)

    const inputs = page.locator('input[type="number"]')
    await inputs.nth(0).fill('4500')
    await inputs.nth(3).fill('15')
    await inputs.nth(8).fill('1200')

    await page.getByRole('button', { name: 'Add Vehicle' }).click()

    await expect(page).toHaveURL('/admin/fleet')
    await expect(page.getByText(plate)).toBeVisible()

    await page.locator('button:has(.lucide-more-vertical)').first().click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).last().click()

    await expect(page.getByText(plate)).not.toBeVisible()
  })

  test('edits a vehicle', async ({ page }) => {
    const plate = `E2E${Date.now().toString(36).toUpperCase().slice(-6)}`

    await page.goto('/admin/fleet/new')
    await page.getByPlaceholder('e.g. Commuter Deluxe').fill(`E2E PreEdit ${plate}`)
    await page.getByPlaceholder('e.g. NBS4512').fill(plate)
    const inputs = page.locator('input[type="number"]')
    await inputs.nth(0).fill('4500')
    await inputs.nth(3).fill('15')
    await inputs.nth(8).fill('1200')
    await page.getByRole('button', { name: 'Add Vehicle' }).click()
    await expect(page).toHaveURL('/admin/fleet')

    await page.locator('button:has(.lucide-more-vertical)').first().click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { name: 'Edit Vehicle' })).toBeVisible()

    await page.getByPlaceholder('e.g. Commuter Deluxe').fill(`E2E Edited ${plate}`)
    await page.getByRole('button', { name: 'Update Vehicle' }).click()

    await expect(page.getByText(`E2E Edited ${plate}`)).toBeVisible()

    await page.locator('button:has(.lucide-more-vertical)').first().click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('back button returns to fleet list', async ({ page }) => {
    await page.goto('/admin/fleet/new')
    await page.getByText('Back to Fleet').click()
    await expect(page).toHaveURL('/admin/fleet')
  })

  test('rental option checkboxes toggle', async ({ page }) => {
    await page.goto('/admin/fleet/new')

    const selfDrive = page.getByLabel('Self Drive')
    await expect(selfDrive).toBeChecked()
    await selfDrive.uncheck()
    await expect(selfDrive).not.toBeChecked()
  })
})
