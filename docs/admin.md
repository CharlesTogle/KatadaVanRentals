# Katada Rentals — Admin Panel Documentation

> **Platform**: CarRentSaaS by Maglacas Digital
> **Tenant**: Katada Transportation Sevices
> **Admin**: Winson Katada (tadsuu@gmail.com)
> **Plan**: Kasosyo Free (lifetime) — 1 vehicle, 10 bookings/mo, 1 team member, 1 GB storage
> **Domain**: katada.carrentsaas.com
> **Date Explored**: July 15, 2026

---

## Sidebar Navigation

```
Dashboard
Bookings
Customers
Our Fleet
Report
  ├── Revenue
  └── Vehicle Utilization
Settings
  ├── Profile
  ├── Password
  ├── Subscription
  ├── Business
  ├── Team
  ├── Payments
  ├── Customer Documents
  ├── Integrations
  ├── Pickup & Drop-off
  ├── Email Log
  ├── Content
  ├── Domain
  ├── Email
  └── Help & Guides
```

Bottom of sidebar shows:
- **Plan name** (Kasosyo Free)
- **Billing type** (One-time · Lifetime)
- **"Book a Free Demo"** button
- **Notification bell** (11 unread)
- **User avatar + name** (Winson Katada, Admin)

---

## Dashboard (`/admin/dashboard`)

### KPI Cards (top row)
| Metric | Value |
|--------|-------|
| Total Bookings | 3 |
| Active Rentals | 0 |
| For Review | 0 |
| Revenue (Month) | ₱0 |

### Upcoming Rentals
Table with columns: **Booking**, **Rental Option**, **Vehicle**, **Date**
Currently: "No upcoming rentals"

### Top Vehicles
Simple list showing vehicle name, brand, and booking count.
Currently: Commuter Deluxe (Toyota) — 3 bookings

### Recent Bookings ("View all" link)
Table showing last 3 bookings:
- Booking ID (e.g. CR-20260714-W0V8Z)
- Customer name + vehicle
- Status badge (Canceled, Confirmed, etc.)

### Recent Signups ("View all" link)
List of last 5 signups:
- Customer name
- Email
- Relative time ("1 hour ago", "1 day ago", "1 week ago")

### Recently Logged In ("View all" link)
Currently empty: "No login activity yet."

---

## Bookings (`/admin/bookings`)

### Layout
- **New Booking** button (top)
- **List / Calendar** toggle
- **Status tabs**: All Statuses | For Review | Awaiting Documents | Pending Price Approval | Confirmed | Rejected | Canceled | On Trip | Completed
- **Filter** button
- **Search** (by booking # or customer name)
- **Filter by status** dropdown

### Booking Table Columns
| Column | Example |
|--------|---------|
| BOOKING # | CR-20260704-ZOORY |
| CUSTOMER | Jercelyn Ocariza, jercelynocariza@gmail.com |
| VEHICLE | Commuter Deluxe, NBS4512, With Driver |
| DATES | Jul 07 – Jul 08, 2026, 3:00 PM – 3:00 PM, 1d |
| PAID | ₱0.00 |
| TOTAL | ₱6,000.00 |
| STATUS | Confirmed |

---

## Booking Detail (`/admin/bookings/{id}`)

### Header Info
- Booking ID (e.g. CR-20260704-ZOORY)
- Status badge
- Summary line: Vehicle · Customer · Dates · Total

### Booking Details Panel
| Field | Example |
|-------|---------|
| Vehicle | Commuter Deluxe |
| Rental Type | With Driver |
| Duration | 1 day |
| Start Date | Jul 07, 2026 · 3:00 PM |
| End Date | Jul 08, 2026 · 3:00 PM |
| Pickup Location | Bagong Barrio East, Caloocan, Metro Manila, Philippines |
| Dropoff Location | Pansol, Calamba, Laguna, Philippines |

### Price Breakdown
| Line Item | Amount |
|-----------|--------|
| Base (1d × ₱4,500.00/day) | ₱4,500.00 |
| Driver (1d × ₱1,500.00/day) | ₱1,500.00 |
| **Total** | **₱6,000.00** |
| Remaining Balance | ₱6,000.00 |

### Customer Panel
- Name, Role (Customer), Email
- "View Profile" link

### Documents Panel
Three document types with status:
| Document | Status |
|----------|--------|
| Driver's License | Missing |
| Valid ID | Missing |
| Proof of Billing | Missing |

### Actions
| Action | Endpoint |
|--------|----------|
| Release Unit / Start Trip | `POST /admin/bookings/{id}/start-trip` |
| Extend Rental | `POST /admin/bookings/{id}/extend` |
| Download Invoice | — |
| Cancel Booking | `POST /admin/bookings/{id}/cancel` |
| Delete Booking | `DELETE /admin/bookings/{id}` |

### Action: Start Trip (`POST /admin/bookings/{id}/start-trip`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `balance_amount` | number | Yes | Remaining balance to collect |
| `payment_method` | select | Yes | Cash, BDO, G-Cash |
| `reference_number` | text | No | e.g. GCash ref, bank transaction ID |
| `receipt_image` | file | No | Upload receipt |

### Action: Extend Rental (`POST /admin/bookings/{id}/extend`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `new_end_datetime` | datetime-local | Yes | New drop-off date/time |
| `extension_amount` | number | Yes | Additional charge |
| `extension_reason` | text | No | e.g. customer requested 2 more days |
| `payment_mode` | radio | No | Collect now vs later |
| `payment_method` | select | No | Cash, BDO, G-Cash |
| `reference_number` | text | No | |
| `receipt_image` | file | No | |

### Action: Cancel Booking (`POST /admin/bookings/{id}/cancel`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `cancellation_type` | radio | Yes | 2-3 type options |
| `cancellation_reason` | textarea | Yes | |

---

## Booking Statuses (Lifecycle)

```
For Review
  ↓
Awaiting Documents
  ↓
Pending Price Approval
  ↓
Confirmed
  ↓
On Trip
  ↓
Completed

Canceled / Rejected — possible from any stage
```

---

## Customers (`/admin/customers`)

### Layout
- **Search** input
- **Export CSV** button

### Customer Table Columns
| Column | Example |
|--------|---------|
| CUSTOMER | Charles Nathaniel Togle, charles3togle@gmail.com, Verified |
| MOBILE | - |
| BOOKINGS | 0 |
| TOTAL SPENT | ₱0.00 |
| LOCATION | Pasay City, Metro Manila, Philippines |
| JOINED | Jul 15, 2026 |
| ACTIONS | View, Login As |

---

## Customer Profile (`/admin/customers/{id}`)

### Header
- Customer name
- Status: Active / Inactive
- Verified badge
- Auth method: Google OAuth or Email

### Info Panel
| Field | Example |
|-------|---------|
| Email | charles3togle@gmail.com |
| Mobile | — |
| Member since | Jul 15, 2026 |
| Total spent | ₱0.00 |
| Address | blk 9005 30b, Pasay City, Metro Manila |

### Tabs
- **Booking History** — table: Booking #, Vehicle, Rental option, Dates, Paid, Total, Status, View action
- **Email Log** — count shown (e.g. "7")
- **Documents** — x/3 (Driver's License, Valid ID, Proof of Billing)

### Actions
| Action | Endpoint |
|--------|----------|
| New Booking | Create booking for this customer |
| Login As | `POST /admin/customers/{id}/login-as` — impersonate customer |
| Deactivate | `POST /admin/customers/{id}/deactivate` |
| Delete | `DELETE /admin/customers/{id}` |

---

## Our Fleet (`/admin/our-fleet`)

### Layout
- **Fleet section**: All Fleet (1), Add New Fleet
- **Brand section**: Brand (1) — Toyota
- **Vehicle Type section**: Vehicle Type (1) — Van
- **Seasonal Rates**: Upgrade-gated ("UPGRADE")
- **Customize Booking**: Upgrade-gated ("UPGRADE")

### Filters
| Filter | Options |
|--------|---------|
| All Brands | Toyota |
| All Types | Van |
| All Rental Options | Self-Drive, With Driver, Both |
| All Services | Pickup & Drop-off enabled, Pickup & Drop-off disabled |
| All Statuses | Available, Not Available |

### Search
Text search across fleet.

### Fleet Table Columns
| Column | Example |
|--------|---------|
| VEHICLE | Commuter Deluxe, NBS4512 |
| TYPE | Van |
| RENTAL | Self-Drive & Driver |
| PICKUP & DROP-OFF | Enabled |
| BASE PRICE | ₱5,200.00 |
| DRIVER RATE | ₱1,800.00 |
| STATUS | Available |
| ACTIONS | Actions dropdown |

---

## Reports

### Revenue Report (`/admin/reports/revenue`)

**Period selector**: 7 Days | 30 Days | 90 Days | 1 Year | All Time | Custom Range

**KPI Cards**:
| Metric | Value |
|--------|-------|
| Total Revenue (30D) | ₱0 |
| Transactions | 0 |
| Avg. per Transaction | ₱0 |
| Best Day | — |

**Sections**:
- **Daily Revenue** — chart/table toggle, verified payments by day
- **Payment Methods** — breakdown by method
- **Top Vehicles** — by verified revenue
- **Top Customers** — by verified revenue
- **Payment Transactions** — table: Date, Booking, Customer, Vehicle, Method, Reference, Amount

All sections currently empty: "No payment data for this period."

### Vehicle Utilization (`/admin/reports/vehicle-utilization`)

| Column | Example |
|--------|---------|
| VEHICLE | Commuter Deluxe, NBS4512 |
| TYPE | Van |
| STATUS | Available |
| TOTAL BOOKINGS | 3 |
| ACTIVE NOW | 0 |
| UTILIZATION | 3 (displayed as number) |

---

## Settings

### Profile (`/admin/settings` — Profile tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `profile_image` | file | No | JPG, PNG, WebP, GIF. Max 4 MB |
| `first_name` | text | No | John |
| `last_name` | text | No | Doe |
| `email` | email | No | john@example.com |
| `phone` | tel | No | +63 912 345 6789 |
| `timezone` | select | No | 11 timezones (UTC, Asia/Manila, Asia/Bangkok, Asia/Singapore, Asia/Hong Kong, Asia/Tokyo, Australia/Sydney, America/New York, America/Los Angeles, Europe/London, Europe/Paris) |
| `date_format` | select | No | Jan 15, 2026 / 15/01/2026 / 01/15/2026 / 2026-01-15 |
| `time_format` | select | No | 14:30 (24-hour) / 02:30 PM (12-hour) |

### Password (`/admin/settings` — Password tab)
| Field | Type | Required |
|-------|------|----------|
| `current_password` | password | Yes |
| `password` | password | Yes |
| `password_confirmation` | password | Yes |

### Business (`/admin/settings` — Business tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `logo` | file | No | |
| `business_name` | text | No | My Car Rental |
| `support_email` | email | No | hello@example.com |
| `support_phone` | text | No | +63 912 345 6789 |
| `facebook_link` | url | No | https://facebook.com/yourbusiness |
| `instagram_link` | url | No | https://instagram.com/yourbusiness |
| `business_address` | text | Yes | 123 Main St, Brgy. Example |
| `city` | text | Yes | e.g. Manila |
| `province` | text | Yes | e.g. Metro Manila |
| `zip_code` | text | Yes | e.g. 6000 |
| `country` | select | Yes | Full country list |
| `tin_number` | text | No | 000-000-000-0000 |
| `vat_percent` | number | No | 0 |
| `default_currency` | select | No | Full currency list (AED, PHP, USD, etc.) |

### Team (`/admin/settings` — Team tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `name` | text | Yes | Juan dela Cruz |
| `email` | email | Yes | admin@example.com |
| `password` | password | Yes | Min. 8 characters |
| `admin_role` | select | Yes | Manager, Staff |

Staff-only: no delete, only role edit.

### Payments (`/admin/settings` — Payments tab)
- **Manual payment methods**: Toggle bank transfer, e-wallet/GCash QR codes, cash-on-pickup
- **Online gateways**: PayPal, Stripe, Xendit (keys, sandbox/live mode, webhooks)

### Customer Documents (`/admin/settings` — Customer Documents tab)
| Field | Type | Options |
|-------|------|---------|
| `license_capture_mode` | radio | Two modes |

Controls how driver's license/ID/proof of billing capture works.

### Integrations (`/admin/settings` — Integrations tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `fb_pixel_id` | text | No | e.g. 1234567890123456 |
| `tiktok_pixel_id` | text | No | e.g. CKXXXXXXXXXXXXXXXX |
| `ga_measurement_id` | text | No | e.g. G-XXXXXXXXXX |
| `gsc_verification` | text | No | e.g. abc123XYZ... |
| `gbp_review_url` | url | No | https://g.page/r/... |
| `facebook_review_url` | url | No | https://www.facebook.com/yourpage/reviews |

### Pickup & Drop-off (`/admin/settings` — Pickup & Drop-off tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `transfer_ors_api_key` | text | Yes | eyJvcmciOiI... |
| Service points | text + number | No | City/address search + radius (km) |

### Email Log (`/admin/settings` — Email Log tab)
| Filter | Options |
|--------|---------|
| Search | Recipient or subject |
| Type | All Types, Booking, Support, OTP, General |
| Period | Last 7 days, Last 14 days, Last 30 days, All time |

### Content / Landing Page Customization (`/admin/settings` — Content tab)

**SEO**:
| Field | Type |
|-------|------|
| `seo_meta_title` | text |
| `seo_meta_description` | textarea |
| `seo_featured_image` | file |

**Header**:
| Field | Type |
|-------|------|
| `header_logo` | file |
| `header_display_name` | text |
| `header_show_business_name` | toggle |

**Hero Section**:
| Field | Type |
|-------|------|
| `hero_trust_badge` | text |
| `hero_title` | text |
| `hero_subtitle` | textarea |

**Fleet Section**:
| Field | Type |
|-------|------|
| `fleet_title` | text |
| `fleet_subtitle` | textarea |

**Testimonials Section**:
- `show_testimonials` checkbox
- Up to 5 testimonials, each with: customer name (text), role (text), review text (textarea)

**FAQ Section**:
- `show_faq` checkbox
- Up to 6 FAQs, each with: question (text), answer (textarea)

**CTA Section**:
- `show_cta` checkbox
- `cta_title` (text)
- `cta_subtitle` (textarea)

### Domain (`/admin/settings` — Domain tab)
| Field | Type | Required |
|-------|------|----------|
| `subdomain` | text | Yes |
| `remove_custom_domain` | toggle | No |

### Email Configuration (`/admin/settings` — Email tab)
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `email_mode` | hidden | No | |
| `business_email` | email | No | hello@yourbusiness.com |
| `mail_from_name` | text | No | Katada Transportation Sevices |

### Help & Guides (`/admin/settings/help`)

9 chapters, 39 planned video walkthroughs (all currently "Coming Soon"):

| # | Chapter | Videos |
|---|---------|--------|
| 1 | Welcome & Activation | 2 (Activating your account, Admin dashboard tour) |
| 2 | Essential Setup | 9 (Business profile, Branding, Adding vehicle, Brands & types, Manual payments, Online gateways, Booking form, Email templates, Going live) |
| 3 | Daily Operations: Bookings | 7 |
| 4 | Payments | 2 |
| 5 | Customers | 3 |
| 6 | Support & Communication | 3 |
| 7 | Growth & Advanced | 4 |
| 8 | Integrations & Tracking | 6 |
| 9 | Team & Account | 3 |

---

## Subscription / Plan Management (`/admin/settings/subscriptions`)

### Current Plan Display
- Plan name + price (Kasosyo Free — ₱0.00 one-time)
- Billing: Lifetime
- Expires: Lifetime
- Usage bars: Bookings/mo (3/10), Vehicles (1/3), Team Members (1/1), Storage (2 MB / 1 GB)

### Limit Details
- Unlimited Bookings / day
- 14 Days Log Retention
- 12 Months Data Retention

### Feature List
| Category | Features |
|----------|----------|
| Core Operations | Booking management, Calendar View, Document management |
| Payments & Integration | GCash & bank transfer payments, Payment tracking |
| Customers & Communication | Customer portal, Email notifications |
| Reports & Analytics | Revenue dashboard & reports, Customer report and analytics |
| Branding & Platform | Business branding, Automated reminders |

### Actions
- **Upgrade Plan** — select plan (Kasosyo Starter, Kasosyo Pro, Kasosyo Growth), billing cycle (monthly/annual), payment method (Gcash, BDO, BPI, GoTyme Bank, PayPal)
- **Cancel Plan** — reason textarea required
- **Payment History** — table: Plan, Amount, Active Period, Method/Ref #, Receipt, Status, Actions

---

## Public Pages (for reference)

### Homepage (`/`)
- Hero with trust badge, title, subtitle, and vehicle search form (pickup location, pickup date/time, drop-off date/time, "Return to different location" checkbox)
- Fleet showcase (1 vehicle: Commuter Deluxe)
- Testimonials (5 reviews shown — 4 with text, 1 with initials only)
- FAQ (6 questions)
- CTA section ("Ready to Hit the Road?")
- Footer: Terms of Service, Privacy Policy, "Powered by CarRentSaaS"

### Contact (`/contact`)
- Form: Name*, Phone*, Email*, Message*, How did you find us?* (select: Google Search, Google Map, Facebook, Instagram, TikTok, Twitter/X, LinkedIn, YouTube, Referral, Others)
- Contact info displayed: Phone (+639064961248), Email (tadsuu@gmail.com), Address (11th 12th St., Villamor, Pasay City, Metro Manila, 1309, Philippines)
- Privacy Policy consent line

### Login (`/login`)
- Email address, Password
- "Remember me" checkbox
- "Forgot password?" link
- Sign In button
- "OR" divider
- "Sign in with Google" button
- "Don't have an account? Register" link
- "Powered by CarRentSaaS" footer

### Terms of Service (`/terms`)
7 sections: Eligibility (21+, valid license, government ID), Bookings & Payments, Cancellations & Refunds, Use of Vehicle, Damages & Liability, Changes, Contact

### Privacy Policy (`/privacy`)
7 sections: Information We Collect, How We Use, Sharing, Data Retention, Cookies, Your Rights, Updates

---

## Notable Gaps / Limitations

- **No customer-facing portal/area** — customers cannot log in to see their bookings, upload documents, or manage their profile via a dedicated dashboard
- **No feedback/review system** — no mechanism for customers to rate or review completed bookings
- **No "My Bookings" view for customers** — booking status is only visible to admin
- **All customer routes 404**: `/bookings`, `/documents`, `/profile`, `/my-bookings`, `/dashboard` (non-admin)
- **Help videos**: 0/39 produced — all marked "Coming soon"
- **Platform typo**: "Sevices" instead of "Services" throughout
- **Pricing data**: Revenue reports show ₱0 because payments are marked unpaid (manual verification flow)
