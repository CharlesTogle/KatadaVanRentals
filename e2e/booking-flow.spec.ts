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
           is_active: true,
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
      body: JSON.stringify({ role, is_active: true }),
    })
  })

  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByPlaceholder('you@example.com').fill(session.user.email)
  await page.getByPlaceholder('Enter your password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function mockAdminBookingDetail(page: import('@playwright/test').Page, status: string, refundStatus: string | null) {
  const booking = {
    id: 'booking-1',
    booking_number: 'CR-260723-ABCD',
    customer_id: 'customer-1',
    guest_name: null,
    guest_email: null,
    guest_mobile: null,
    vehicle_id: 'vehicle-1',
    rental_model: 'all_in',
    status,
    start_at: '2026-08-20T08:00:00.000Z',
    end_at: '2026-08-21T08:00:00.000Z',
    duration_days: 1,
    pickup_location: 'Pickup',
    dropoff_location: 'Dropoff',
    destination: 'Destination',
    purpose_of_travel: 'Business',
    notes: null,
    self_drive_address: null,
    distance_km: 20,
    duration_minutes: 60,
    toll_estimate_amount: 0,
    toll_segments: [],
    fuel_estimate_liters: 0,
    fuel_estimate_amount: 0,
    actual_toll_amount: 0,
    actual_fuel_amount: 0,
    delivery_fee: 0,
    recovery_fee: 0,
    discount_amount: 0,
    deposit_amount: 500,
    subtotal_amount: 4500,
    total_amount: 4500,
    paid_amount: 500,
    remaining_amount: 4000,
    price_line_items: [{ label: 'Base', detail: '1d x 4500', amount: 4500 }],
    booking_mode: 'keep',
    flagged_for_manual_pricing: false,
    in_service_area: true,
    idempotency_key: null,
    created_by: 'customer-1',
    created_at: '2026-07-20T08:00:00.000Z',
    updated_at: '2026-07-20T08:00:00.000Z',
    canceled_at: status === 'canceled' ? '2026-07-20T09:00:00.000Z' : null,
    completed_at: null,
    profiles: { id: 'customer-1', first_name: 'Alex', last_name: 'Customer', email: 'customer@example.com', mobile: '+63 900 000 0000' },
    vehicles: { id: 'vehicle-1', name: 'Toyota Commuter', plate_number: 'ABC123', image_paths: [] },
  }

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.includes('/rpc/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
      return
    }

    if (path.endsWith('/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'admin-1', role: 'admin', first_name: 'Ada', last_name: 'Admin', email: 'admin@example.com' }),
      })
      return
    }

    if (path.endsWith('/bookings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(booking) })
      return
    }

    if (path.endsWith('/booking_cancellations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(refundStatus ? { cancellation_type: 'customer_request', reason: 'Customer requested cancellation.', refund_status: refundStatus, created_at: '2026-07-20T09:00:00.000Z' } : null),
      })
      return
    }

    if (path.endsWith('/app_settings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ booking_expiry_hours: 2, support_email: 'support@example.com', tax_mode: 'unregistered' }) })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await mockLogin(page, adminSession, 'admin', '/admin/bookings/CR-260723-ABCD')
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

  test('admin can cancel a for-review booking', async ({ page }) => {
    let cancellationRequest: Record<string, unknown> | null = null
    await mockAdminBookingDetail(page, 'for_review', null)
    await page.route('**/rest/v1/rpc/admin_cancel_booking', async (route) => {
      cancellationRequest = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) })
    })

    await page.getByRole('button', { name: 'Cancel Booking', exact: true }).click()
    await page.getByLabel('Admin cancellation - no refund').check()
    await page.getByPlaceholder('Reason for cancellation...').fill('Admin cancellation test')
    await page.getByRole('button', { name: 'Confirm Cancel' }).click()

    await expect.poll(() => cancellationRequest).toEqual({
      target_booking_id: 'booking-1',
      cancellation_type: 'admin_no_refund',
      reason: 'Admin cancellation test',
    })
  })

  test('admin can process a pending refund', async ({ page }) => {
    let refundRequest: Record<string, unknown> | null = null
    await mockAdminBookingDetail(page, 'canceled', 'pending_refund')
    await page.route('**/rest/v1/rpc/admin_process_booking_refund', async (route) => {
      refundRequest = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) })
    })

    await expect(page.getByText('non-refundable')).not.toBeVisible()
    await page.getByRole('button', { name: 'Process Refund', exact: true }).last().click()
    await expect(page.getByText('Amount refunded: ₱500.00')).toBeVisible()
    await expect(page.getByPlaceholder('Enter the amount refunded')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Process Refund', exact: true }).last()).toBeDisabled()
    await page.route('**/storage/v1/object/payment-receipts/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'booking-1/refund-proof.png' }) })
    })
    await page.locator('input[type="file"]').setInputFiles({ name: 'refund-proof.png', mimeType: 'image/png', buffer: Buffer.from('proof') })
    await page.getByRole('button', { name: 'Process Refund', exact: true }).last().click()

    await expect.poll(() => refundRequest).toEqual(expect.objectContaining({
      target_booking_id: 'booking-1',
      p_refund_amount: 500,
      p_refund_method_id: null,
      p_refund_channel: null,
      p_refund_reference: null,
    }))
  })

})
