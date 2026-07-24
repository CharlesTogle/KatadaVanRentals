import { expect, test } from '@playwright/test'

const customerSession = {
  access_token: 'customer-token',
  refresh_token: 'customer-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: {
    id: 'customer-1',
    email: 'customer@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: { full_name: 'Alex Customer' },
  },
}

const adminSession = {
  ...customerSession,
  access_token: 'admin-token',
  refresh_token: 'admin-refresh',
  user: {
    ...customerSession.user,
    id: 'admin-1',
    email: 'admin@example.com',
    user_metadata: { full_name: 'Ada Admin' },
  },
}

async function mockLogin(page: import('@playwright/test').Page, session: typeof customerSession, role: 'customer' | 'admin', redirect: string) {
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
  })

  await page.route('**/rest/v1/profiles*', async (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') || ''

    if (select === '*') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: session.user.id,
          role,
          first_name: role === 'admin' ? 'Ada' : 'Alex',
          last_name: role === 'admin' ? 'Admin' : 'Customer',
          email: session.user.email,
          mobile: '+63 900 000 0000',
          address: '123 Test St',
          city: 'Quezon City',
          province: 'Metro Manila',
          zip_code: '1100',
          country: 'Philippines',
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role }),
    })
  })

  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByPlaceholder('you@example.com').fill(session.user.email)
  await page.getByPlaceholder('Enter your password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('Booking flows', () => {
  test('customer booking form blocks self-drive when required documents are missing', async ({ page }) => {
    await page.route('**/rest/v1/vehicles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'vehicle-1',
          name: 'Toyota Commuter',
          base_price_per_day: 4500,
          driver_rate_per_day: 800,
          transmission: 'Manual',
          passenger_count: 10,
          image_paths: [],
        }),
      })
    })

    await page.route('**/rest/v1/customer_documents*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.route('**/rest/v1/payment_methods*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'pm-1', provider: 'BDO', account_number: '1234', channel: 'bank_transfer' }]),
      })
    })

    await mockLogin(page, customerSession, 'customer', '/dashboard/book/vehicle-1?type=self-drive&start=2026-07-25T08:00:00.000Z&end=2026-07-26T08:00:00.000Z')

    await expect(page.getByText(/Profile documents required for Self-Drive/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit Booking' })).toBeDisabled()
  })

  test('admin can move a for-review booking to confirmed from the bookings page', async ({ page }) => {
    let bookingStatus = 'for_review'

    await page.route('**/rest/v1/bookings*', async (route) => {
      if (route.request().method() === 'PATCH') {
        bookingStatus = 'confirmed'
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'booking-1',
              booking_number: 'CR-260723-ABCD',
              total_amount: 4500,
              status: bookingStatus,
            },
          ]),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'booking-1',
            booking_number: 'CR-260723-ABCD',
            total_amount: 4500,
            status: bookingStatus,
            profiles: { first_name: 'Alex', last_name: 'Customer', email: 'customer@example.com' },
            vehicles: { name: 'Toyota Commuter', plate_number: 'ABC123' },
          },
        ]),
      })
    })

    await mockLogin(page, adminSession, 'admin', '/admin/bookings')

    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    await expect(page.getByText('confirmed')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Trip' })).toBeVisible()
  })
})
