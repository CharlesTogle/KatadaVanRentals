# Katada Rentals — Customer Portal Documentation

> **Platform**: CarRentSaaS by Maglacas Digital
> **Tenant**: Katada Transportation Sevices
> **Test Account**: charles3939togle@gmail.com / testing123
> **Domain**: katada.carrentsaas.com
> **Date Explored**: July 15, 2026

---

## Implementation Model

- Architecture is client-side React plus Supabase ORM/data access.
- This is not a tiered backend architecture and not a microservices design.
- Page paths in this document identify screens only; they are not API contracts.
- Actions such as login, booking save, document upload, payment verification, and settings updates are logical UI actions backed by Supabase records, auth, and storage.

---

## Customer Journey Overview

### Account Creation
1. Customer clicks "Register" on `/login` or proceeds through booking flow
2. Google OAuth or email/password registration
3. Email verification via OTP
4. Address collection (`/registration/address`) — redirects to dashboard once logged in
5. Document upload (`/registration/documents`) — redirects to dashboard once logged in
6. Redirected to `/dashboard`

### Login Methods
- Email + Password
- Google OAuth ("Sign in with Google")
- "Remember me" checkbox

---

## Customer Dashboard (`/dashboard`)

### URL Structure
Single-page dashboard with tab-based navigation via query params:
- `/dashboard` — Overview
- `/dashboard?tab=my-bookings` — Bookings list
- `/dashboard?tab=documents` — Document uploads
- `/dashboard?tab=my-profile` — Profile & password

### Navigation (Sidebar/Header)
```
Our Fleet (public page)
Contact
[Notification Bell] — unread count
[User Avatar] → Charles Nathaniel Togle
                     charles3939togle@gmail.com
                   ─────────────────
                     Dashboard
                     My Bookings
                     Documents
                     My Profile
                     Logout
```

### Logout
Logout is a client-side auth action available from sidebar, mobile menu, and account dropdown.

---

## Dashboard Overview Tab

### Header
- "Welcome, Charles Nathaniel Togle!"
- **"+ Book Now"** button

### KPI Cards
| Metric | Value |
|--------|-------|
| Total Bookings | 0 |
| Active | 0 |
| Under Review | 0 |
| Completed | 0 |

### Recent Bookings
Table with columns: **Booking #**, **Vehicle**, **Dates**, **Total**, **Status**, **Action**

Empty state: "No bookings yet. Book a car now!"

---

## My Bookings Tab (`/dashboard?tab=my-bookings`)

### Status Filter Tabs
```
All Status | For Review | Awaiting Documents | Pending Price Approval |
Confirmed | Rejected | Canceled | On Trip | Completed
```

### Bookings Table
| Column | Description |
|--------|-------------|
| BOOKING # | Booking reference (e.g. CR-20260714-W0V8Z) |
| VEHICLE | Vehicle name/model |
| DATES | Pickup – Drop-off date range |
| DURATION | Rental duration (e.g. "1d") |
| TOTAL | Booking total (₱) |
| STATUS | Badge (Confirmed, On Trip, Completed, etc.) |
| ACTIONS | View, Cancel, etc. (status-dependent) |

Empty state: "You have no bookings yet." + **"Browse Vehicles"** link

### Booking Lifecycle (Customer View)
Same as admin but customer has no admin actions (Start Trip, Extend, etc.):
```
For Review → Awaiting Documents → Pending Price Approval →
Confirmed → On Trip → Completed
           → Canceled (by customer/admin)
           → Rejected (by admin)
```

### Missing: Booking Detail Page
- No dedicated customer-facing booking detail page found
- No way for customer to see price breakdown, pickup/drop-off addresses, or document status per booking
- "View" action in table likely links to an admin-style detail, or is minimal

### After-Trip Feedback
- Feedback becomes available only after a booking reaches **Completed**.
- Customer can add a star rating and written feedback from the completed booking detail.
- Feedback is linked to the completed booking, customer, and vehicle.
- Submitted feedback is visible to admin in the **View Feedback** admin module.
- Admin can review feedback before using it publicly as a testimonial.

---

## Documents Tab (`/dashboard?tab=documents`)

### Document Slots (3 required)
| Document | Status | Accepted Types |
|----------|--------|----------------|
| Driver's License | Not uploaded | — |
| Other Valid ID's | Not uploaded | Passport, SSS ID, PhilHealth, Postal ID, Voter's ID, etc. |
| Proof of Billing | Not uploaded | Electricity, water, internet, or phone bill (within 3 months) |

### Upload Behavior
- **Auto-save** — each document saved immediately on upload, no Submit/Save button
- Uploads can be done one at a time
- System note: "Each document is saved automatically as soon as you add it — there's no Save button. You can upload them one at a time, even on a slow connection."

### Document Capture Mode (Admin Setting)
Admin controls in Settings → Customer Documents:
- `license_capture_mode` radio — controls how strictly documents are required (e.g., mandatory before booking vs. optional)

---

## My Profile Tab (`/dashboard?tab=my-profile`)

### Profile Photo
- File upload: JPG, PNG, WebP, or GIF, max 4 MB
- Falls back to Gravatar associated with email if no photo uploaded

### Personal Information
| Field | Type | Required | Placeholder/Notes |
|-------|------|----------|-------------------|
| `profile_image` | file | No | JPG, PNG, WebP, GIF, max 4 MB |
| `first_name` | text | Yes | |
| `last_name` | text | Yes | |
| `email` | email | Yes | Pre-filled, read-only intent |
| `mobile` | text | Yes | +63 917 XXX XXXX |
| `address` | text | Yes | Complete address |
| `city` | text | Yes | |
| `province` | text | Yes | |
| `zip` | text | Yes | |
| `country` | select | Yes | Full country list (Philippines default) |

Saved through the customer profile record in Supabase.

### Change Password
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `current_password` | password | Yes | Toggle visibility |
| `password` | password | Yes | Min. 8 characters, toggle visibility |
| `password_confirmation` | password | Yes | Toggle visibility |

All three password fields have show/hide toggle buttons.

---

## Public Pages (Customer Context)

### Homepage (`/`)
- Header nav changes when logged in: **Home**, **Our Fleet**, Testimonials, FAQ, Contact, **My Account** (dashboard link)
- Search form: Pick-up Location, Pick-up Date & Time, Drop-off Date & Time, "Return to a different location" checkbox
- Fleet showcase with vehicle card (Commuter Deluxe)
- Testimonials (5 entries)
- FAQ (6 questions)
- CTA: "Ready to Hit the Road?" + Book Now
- Footer: Terms, Privacy, "Powered by CarRentSaaS"

### Our Fleet (`/our-fleet`)
- Page title: "Browse Vehicles"
- Subtitle: "Find the perfect vehicle for your trip"
- Vehicle search form: Pick-up Location, Pick-up Date & Time, Drop-off Date & Time, "Return to a different location"
- Vehicle card per vehicle with: status badge, type, name, rental options, features, price/day, "View" button
- Currently 1 vehicle: Commuter Deluxe

### Contact (`/contact`)
- Form: Name*, Phone*, Email*, Message*, How did you find us?*
- Business info: Phone, Email, Address
- Same page regardless of auth state

---

## Registration Flow

### `/verify-email`
- Redirects to dashboard if already logged in
- Otherwise: OTP verification page (this customer already verified)

### `/registration/address`
- Redirects to dashboard if already logged in
- Onboarding step: collect address before first booking
- Fields likely: address, city, province, zip, country (same as profile)

### `/registration/documents`
- Redirects to dashboard if already logged in
- Onboarding step: upload documents before booking (Driver's License, Valid ID, Proof of Billing)

---

## Logical Actions Summary (Customer Side)

### Logout
```
Sign out current authenticated user
```

### Profile Update
```
  profile_image (file)
  first_name (text, required)
  last_name (text, required)
  email (email, required)
  mobile (text, required, placeholder="+63 917 XXX XXXX")
  address (text, required)
  city (text, required)
  province (text, required)
  zip (text, required)
  country (select, required, full country list)
```

### Password Change
```
  current_password (password, required, toggleable)
  password (password, required, min 8 chars, toggleable)
  password_confirmation (password, required, toggleable)
```

### Document Upload
```
  document_type (driver_license | valid_id | proof_of_billing)
  file (file upload)
  Auto-saved — no submit button
```

### Contact Form
```
  name (text, required)
  phone (text, required)
  email (email, required)
  message (textarea, required)
  source (select, required) — Google Search, Google Map, Facebook,
    Instagram, TikTok, Twitter/X, LinkedIn, YouTube, Referral, Others
```

---

## Customer Screens And Actions

| Screen / Action | Purpose |
|-----------------|---------|
| Login | Email/password or Google sign-in |
| Register | Customer account creation |
| Verify Email | OTP verification |
| Registration Address | Onboarding address collection |
| Registration Documents | Onboarding document upload |
| Dashboard Overview | Customer dashboard summary |
| My Bookings | Booking list and filters |
| Documents | Customer document uploads |
| My Profile | Profile and password management |
| Profile Save | Persist customer profile details in Supabase |
| Password Change | Update authenticated user's password |
| Logout | End current auth session |
| Our Fleet | Browse available vehicles |
| Contact | Submit contact inquiry |

---

## Notable Gaps (Customer Side)

| Gap | Detail |
|-----|--------|
| **No booking detail page** | Customer cannot see comprehensive booking breakdown (price, locations, documents per booking) |
| **No admin feedback module yet** | Customers should be able to add after-trip feedback; admin needs a View Feedback module to review it |
| **No payment portal** | Customer cannot see payment status, outstanding balance, or make payments from dashboard |
| **No invoice download** | Customer cannot download invoice from their dashboard |
| **No booking cancellation** | Table shows "Actions" column but unclear if customer can self-cancel |
| **No notifications page** | Bell icon shows count but no dedicated notifications/messages page |
| **No booking creation from dashboard** | "+ Book Now" button exists but may navigate to public fleet page, not a dedicated booking form |
| **Documents not linked to bookings** | Documents are profile-level, no way to attach specific docs to specific bookings |

---

## Admin Pages Recheck (Playwright Pass)

> Source: Live crawl of requested admin pages on July 15, 2026. Subscription pages intentionally excluded.

### Shared Admin Shell

- Sidebar: Dashboard, Bookings, Customers, Our Fleet, View Feedback, Report, Settings
- Plan badge: Kasosyo Free, One-time · Lifetime
- Header includes **Book a Free Demo**, notification bell with **12** unread, and admin profile menu
- Admin shown: Winson Katada, Admin
- Logout is a client-side auth action
- Notification dropdown actions found: **Mark all read**, close `×`

### Admin Dashboard (`/admin/dashboard`)

#### Header
- Breadcrumb/page: Dashboard
- Date context: `Overview · July 15, 2026`
- Reports shortcut/link shown near heading area

#### KPI Cards
| Metric | Value |
|--------|-------|
| Total Bookings | 3 |
| Active Rentals | 0 |
| For Review | 0 |
| Revenue (Month) | ₱0 |

#### Upcoming Rentals
| Column |
|--------|
| Booking |
| Rental Option |
| Vehicle |
| Date |

Empty state: **No upcoming rentals**

#### Top Vehicles
| Vehicle | Brand | Count |
|---------|-------|-------|
| Commuter Deluxe | Toyota | 3 bookings |

#### Recent Bookings
| Booking # | Customer / Vehicle | Status |
|-----------|--------------------|--------|
| CR-20260714-W0V8Z | Ms Nancy Seva · Commuter Deluxe | Canceled |
| CR-20260713-ODOUM | Maru Macaltao · Commuter Deluxe | Confirmed |
| CR-20260704-ZOORY | Jercelyn Ocariza · Commuter Deluxe | Confirmed |

#### Recent Signups
| Customer | Email | Time |
|----------|-------|------|
| Charles Nathaniel Togle | charles3939togle@gmail.com | 46 minutes ago |
| Charles Nathaniel Togle | charles3togle@gmail.com | 2 hours ago |
| Ms Nancy Seva | info@heyylandgroup.com | 1 day ago |
| Maru Macaltao | marumacaltao@gmail.com | 2 days ago |
| Jercelyn Ocariza | jercelynocariza@gmail.com | 1 week ago |

#### Recently Logged In
Previous pass showed empty; live recheck shows populated activity:

| Customer | Email | Status | Time |
|----------|-------|--------|------|
| Charles Nathaniel Togle | charles3939togle@gmail.com | Online | 23 minutes ago |

---

### Admin Bookings (`/admin/bookings`)

#### Header / Controls
- Breadcrumb: Dashboard › Bookings
- Subtitle: `Manage and review all car rental bookings`
- **New Booking** button
- View toggle: **List**, **Calendar**
- Status tabs: All Statuses, For Review, Awaiting Documents, Pending Price Approval, Confirmed, Rejected, Canceled, On Trip, Completed
- Delete confirmation modal exists with title **Delete booking?** and buttons **Cancel**, **Delete**

#### Filters
```
  search (text, placeholder="Booking # or customer…")
  booking_status (select)
    All Statuses
    For Review
    Awaiting Documents
    Pending Price Approval
    Confirmed
    Rejected
    Canceled
    On Trip
    Completed
```

#### Table Columns
| Column |
|--------|
| Booking # |
| Customer |
| Vehicle |
| Dates |
| Paid |
| Total |
| Status |

#### Live Rows
| Booking # | Customer | Vehicle | Dates | Paid | Total | Status |
|-----------|----------|---------|-------|------|-------|--------|
| CR-20260713-ODOUM | Maru Macaltao, marumacaltao@gmail.com | Commuter Deluxe, NBS4512 · Pickup & Drop-off | Jul 13, 2026, 3:30 PM · One-way | ₱0.00 | ₱3,200.00 | Confirmed |
| CR-20260704-ZOORY | Jercelyn Ocariza, jercelynocariza@gmail.com | Commuter Deluxe, NBS4512 · With Driver | Jul 07 – Jul 08, 2026, 3:00 PM – 3:00 PM · 1d | ₱0.00 | ₱6,000.00 | Confirmed |
| CR-20260714-W0V8Z | Ms Nancy Seva, info@heyylandgroup.com | Commuter Deluxe, NBS4512 · With Driver | Jul 26 – Jul 31, 2026, 8:00 AM – 8:00 PM · 5d 12h | ₱0.00 | ₱35,000.00 | Canceled |

#### Delete Action
```
Delete selected booking after confirmation
```

---

### Admin Customers (`/admin/customers`)

#### Header / Controls
- Breadcrumb: Dashboard › Customers
- Subtitle: `Registered customer accounts`
- Search button
- Export CSV button
- Actions dropdown includes **Login as Customer**, **Deactivate Account**, **Delete Account**

#### Search
```
  search (text, placeholder="Name, email, or mobile...")
```

#### Table Columns
| Column |
|--------|
| Customer |
| Mobile |
| Bookings |
| Total Spent |
| Location |
| Joined |
| Actions |

#### Live Rows
| Customer | Email | Mobile | Bookings | Total Spent | Location | Joined |
|----------|-------|--------|----------|-------------|----------|--------|
| Charles Nathaniel Togle | charles3939togle@gmail.com | 09281995178 | 0 | ₱0.00 | Pasay City, Metro Manila, Philippines | Jul 15, 2026 |
| Charles Nathaniel Togle | charles3togle@gmail.com | - | 0 | ₱0.00 | Pasay City, Metro Manila, Philippines | Jul 15, 2026 |
| Ms Nancy Seva | info@heyylandgroup.com | 09293047733 | 1 | ₱0.00 | - | Jul 14, 2026 |
| Maru Macaltao | marumacaltao@gmail.com | - | 1 | ₱3,200.00 | - | Jul 13, 2026 |
| Jercelyn Ocariza | jercelynocariza@gmail.com | - | 1 | ₱6,000.00 | - | Jul 04, 2026 |
| dfzb sdhss | hgssth@gmail.com | - | 0 | ₱0.00 | - | Jul 03, 2026 |
| Nel Nol | sample@gmail.com | 09067851423 | 0 | ₱0.00 | - | Jul 03, 2026 |
| Arman Collado | sgtcollado947454.bncoc274@gmail.com | - | 0 | ₱0.00 | pasay, NCR, Philippines | Jul 03, 2026 |
| A1C kenneth imbang PAF | kenrokillian@gmail.com | 09305694535 | 0 | ₱0.00 | Pasay, Manila, Philippines | Jul 03, 2026 |

#### Row Actions
```
Login as Customer
Deactivate Account
Delete Account
```

---

### Admin View Feedback

New admin module for after-trip customer feedback.

#### Purpose
- Give admins one place to review feedback submitted after completed trips.
- Keep operational feedback separate from public testimonials until admin approves or chooses to reuse it.

#### List View
| Column | Description |
|--------|-------------|
| Booking | Booking reference tied to the completed trip |
| Customer | Customer name and email |
| Vehicle | Vehicle rented |
| Rating | Star rating submitted by customer |
| Feedback | Written after-trip comment |
| Submitted | Date/time feedback was submitted |
| Status | New, reviewed, approved for testimonial, hidden |
| Actions | View, mark reviewed, approve for testimonial, hide |

#### Logical Actions
```
View feedback detail
Mark feedback as reviewed
Approve feedback for testimonial use
Hide feedback from testimonial use
```

#### Rules
- Feedback can only be created by the customer who owns the completed booking.
- One feedback entry per completed booking.
- Admin can view all feedback across customers and vehicles.
- Feedback does not automatically become a public testimonial.
- Approved feedback can be reused in the Content testimonials section.

---

### Admin Our Fleet (`/admin/our-fleet`)

#### Header / Navigation
- Breadcrumb: Dashboard › Our Fleet
- Fleet section: All Fleet (1), Add New Fleet, Brand (1), Vehicle Type (1), Seasonal Rates (UPGRADE)
- Settings section: Customize Booking (UPGRADE)

#### Filters
```
  search (text, placeholder="Search name, plate, or brand...")
  brand (select: All Brands, Toyota)
  vehicle_type (select: All Types, Van)
  rental_option (select: All Rental Options, Self-Drive, With Driver, Both)
  transfer (select: All Services, Pickup & Drop-off enabled, Pickup & Drop-off disabled)
  status (select: All Statuses, Available, Not Available)
```

#### Table Columns
| Column |
|--------|
| Vehicle |
| Type |
| Rental |
| Pickup & Drop-off |
| Base Price |
| Driver Rate |
| Status |
| Actions |

#### Live Row
| Vehicle | Type | Rental | Pickup & Drop-off | Base Price | Driver Rate | Status | Actions |
|---------|------|--------|-------------------|------------|-------------|--------|---------|
| Commuter Deluxe, NBS4512 | Van | Self-Drive & Driver | Enabled | ₱5,200.00 | ₱1,800.00 | Available | Actions, Preview, Edit, Not Available, Delete |

#### Status Toggle Action
```
Mark vehicle as Not Available / Available
```

---

### Admin Revenue Report (`/admin/reports/revenue`)

#### Header / Controls
- Breadcrumb: Dashboard › Reports › Revenue
- Subtitle: `Verified payment collections · Last 30 days`
- Period selector: 7 Days, 30 Days, 90 Days, 1 Year, All Time, Custom Range
- Export CSV button
- Daily Revenue view toggle: Chart, Table

#### Period Filter
```
  period (select, id=revPeriod)
  date_from (date, default 2026-06-16)
  date_to (date, default 2026-07-15)
  button: Apply
```

#### KPI Cards
| Label | Value |
|-------|-------|
| 30D Total Revenue | ₱0 |
| Payments / Transactions | 0 |
| Average / Avg. per Transaction | ₱0 |
| Top / Best Day | — |

#### Daily Revenue Table
| Column |
|--------|
| Day |
| Transactions |
| Revenue |
| Avg / Txn |
| vs Prev |

Rows currently show dates from Jun 16, 2026 onward with no transactions and ₱0.00 revenue.

#### Sections
- Payment Methods: empty state **No payment data for this period**
- Top Vehicles: **TOP 0**, empty state **No revenue data for this period**
- Top Customers: **TOP 0**, empty state **No revenue data for this period**
- Payment Transactions: `Verified payments · 0 total`

#### Payment Transactions Table
| Column |
|--------|
| Date |
| Booking |
| Customer |
| Vehicle |
| Method |
| Reference |
| Amount |

Empty state: **No verified payments for this period**

#### Export Options
```
  period (hidden, default 30)
  date_from (hidden)
  date_to (hidden)
  columns[] checkboxes include:
    date
    booking_number
    customer_name
    customer_email
    vehicle
    method
    category
  buttons: Cancel, Download CSV
```

---

### Admin Settings Profile Route (`/admin/settings/profile`)

The profile route renders the full settings shell. Subscription content exists in the DOM but is intentionally excluded from this pass.

#### Settings Navigation
| Group | Items |
|-------|-------|
| Account | Profile, Password |
| Billing | Subscription (excluded) |
| Business | Business, Team, Payments, Customer Documents, Integrations, Pickup & Drop-off, Email Log, Content |
| Configuration | Domain, Email |
| Help | Help & Guides |

#### Profile Settings Form
```
  profile_image (file)
  profile_image_remove (checkbox, value=1)
  first_name (text, placeholder="John", current Winson)
  last_name (text, placeholder="Doe", current Katada)
  email (email, placeholder="john@example.com", current tadsuu@gmail.com)
  phone (tel, placeholder="+63 912 345 6789", current 09064961248)
  timezone (select)
  date_format (select)
  time_format (select)
```

Profile image note: JPG, PNG, WebP or GIF, max 4 MB. Empty image uses Gravatar.

Timezone options:
```
UTC, Asia/Manila (PHT), Asia/Bangkok (ICT), Asia/Singapore (SGT),
Asia/Hong Kong (HKT), Asia/Tokyo (JST), Australia/Sydney (AEDT),
America/New York (EST), America/Los Angeles (PST), Europe/London (GMT),
Europe/Paris (CET)
```

Date format options: Jan 15, 2026; 15/01/2026; 01/15/2026; 2026-01-15

Time format options: 14:30 (24-hour); 02:30 PM (12-hour)

#### Password Form
```
  current_password (password, required)
  password (password, required)
  password_confirmation (password, required)
  buttons: visibility toggles, Update Password
```

#### Business Form
```
  logo (file)
  business_name (text, current Katada Transportation Sevices)
  support_email (email, current tadsuu@gmail.com)
  support_phone (text, current +639064961248)
  facebook_link (url, current https://www.facebook.com/profile.php?id=61559751437908)
  instagram_link (url)
  business_address (text, required, current 11th 12th St., Villamor)
  city (text, required, current Pasay City)
  province (text, required, current Metro Manila)
  zip_code (text, required, current 1309)
  country (select, required)
  tin_number (text)
  vat_percent (number, current 0)
  default_currency (select + hidden value PHP)
  buttons: Remove, Save Business Info
```

#### Guest Booking Toggle
```
  guest_booking_enabled (hidden 0)
  guest_booking_enabled (checkbox 1)
```

#### Customer Documents Form
```
  license_capture_mode (radio: simple)
  license_capture_mode (radio: lto)
  button: Save Document Settings
```

#### Team Member Forms
```
Add team member:
  name (text, required, placeholder="Juan dela Cruz")
  email (email, required, placeholder="admin@example.com")
  password (password, required, placeholder="Min. 8 characters")
  admin_role (select, required: Manager, Staff)
  buttons: Generate, Cancel, Add Team Member

Delete team member

Update team member role:
  admin_role (select, required: Manager, Staff)
  buttons: Cancel, Save Changes
```

#### Payments Settings
Saved manual methods found:

| Bank / Provider | Branch | Currency | Account Number | Account Name | Account Type | Status |
|-----------------|--------|----------|----------------|--------------|--------------|--------|
| BDO | - | PHP | 010960093346 | Winson Katada | Savings | Active |
| G-Cash | - | PHP | 09064961248 | Winson Katada | Savings | Active |

Forms:
```
Manual payment methods:
  saved payment-method list

Payment gateways:
  saved gateway configuration
```

#### Pickup & Drop-off Form
```
  transfer_ors_api_key (text, required)
  saved service points
  city/address search input (placeholder="Search a city or address…")
  radius input (number, placeholder="Radius (km)")
  buttons: Change location, Add another location, Use my business address, Save Pickup & Drop-off Settings
```

Current service point JSON includes Pasay, Metro Manila, Philippines with radius `900`.

#### Integrations Form
```
  fb_pixel_id (text)
  tiktok_pixel_id (text)
  ga_measurement_id (text)
  gsc_verification (text)
  gbp_review_url (url)
  facebook_review_url (url)
  buttons: Copy URL, Regenerate URL, Save Integrations
```

Calendar token regenerate form:
```
Regenerate calendar token
```

#### Email Log
Filter form:
```
  tab=email-log
  search (text, placeholder="Search recipient or subject...")
  type (select: All Types, Booking, Support, OTP, General)
  period (select: Last 7 days, Last 14 days, Last 30 days, All time)
```

Clear expired email logs:
```
Clear expired email log records
```

Email log table columns:
| Column |
|--------|
| Time |
| Recipient |
| Subject |
| Type |
| Status |
| Description |
| User |
| Actions |

Recent rows include delivered welcome emails, OTP emails, and new-customer registration notifications.

#### Content Settings Form
```
  home_theme (hidden, current aurora)
  seo_meta_title (text)
  seo_meta_description (textarea)
  seo_featured_image_remove (hidden)
  seo_featured_image (file)
  header_logo (file)
  header_logo_remove (hidden)
  header_display_name (text, placeholder="Katada Transportation Sevices")
  header_show_business_name (hidden)
  hero_trust_badge (text, current Trusted by 100+ Happy Customers)
  hero_title (text, current Affordable and Reliable Van Rental in Pasay Metro Manila)
  hero_subtitle (textarea)
  fleet_title (text, current Find the Perfect Vehicle)
  fleet_subtitle (textarea)
  show_testimonials (checkbox)
  testimonials (5 saved reviews)
  show_faq (checkbox)
  faqs (6 saved questions)
  show_cta (checkbox)
  cta_title (text, current Ready to Hit the Road?)
  cta_subtitle (textarea)
  button: Save Content
```

Testimonials currently configured:
| Name | Role |
|------|------|
| Angel Del Monte | Business Traveler |
| Renan Regulto | Family Trip |
| Alyosha McDrei | Family Trip |
| Princess Michaela Manalo | Wedding Service |
| Froilan Angeles | Self Drive |

FAQ count: 6 configured questions.

#### Domain Form
```
  remove_custom_domain (hidden, 0)
  subdomain (text, required)
  button: Save Subdomain
```

#### Email Settings Form
```
  email_mode (hidden, platform)
  business_email (email, current tadsuu@gmail.com)
  mail_from_name (text, placeholder="Katada Transportation Sevices")
  button: Save Email Settings
```

#### Help & Guides
- Help & Guides tab present in the settings shell.
- Setup & Video Guides heading is present.

---

## Vehicle Detail Page (`/our-fleet/{slug}`)

Example: `/our-fleet/commuter-deluxe`

### Layout
- Back link / breadcrumb
- Vehicle name (H1)
- **Specs badge row**: 10 Passengers, 10 Bags, Manual, Diesel, Van
- Starts at ₱5,200/day
- Description paragraph
- **Quick Estimate** tool

### Quick Estimate
Interactive pricing tool on the vehicle detail page:
- **Rental type toggle**: Self-Drive / With Driver (radio-style)
- **Start Date & Time** picker
- **End Date & Time** picker (only shown for Self-Drive and With Driver "keep the car" mode)
- **Availability indicator**: "Available for selected dates"
- **Dynamic price calculation**:
  - Self-Drive: `Base (Nd × ₱5,200)` → Estimated Total
  - With Driver: shows base + driver rate
- **"Book Now" button** → navigates to `/dashboard/book/{vehicle_id}?type={rental_type}&start={datetime}&end={datetime}`

No payment collected here — just an estimate that feeds into the booking form.

---

## Booking Flow (`/dashboard/book/{vehicle_id}`)

### URL Parameters
| Param | Description | Example |
|-------|-------------|---------|
| `type` | Rental type | `self-drive`, `with-driver`, `both` |
| `start` | Start datetime (ISO) | `2026-07-15T18:43` |
| `end` | End datetime (ISO) | `2026-07-16T18:43` |
| `pickup_detail` | Show pickup&dropoff sub-mode | `1` |

### Booking Form Save
Booking data is saved as a Supabase booking record with related payment, document, and route fields where applicable.

### Common Fields Across All Rental Types

**Vehicle Info** (hidden):
| Field | Type | Description |
|-------|------|-------------|
| `vehicle_id` | hidden | Vehicle ID (e.g. 79) |
| `rental_type` | hidden | `self-drive` or `with-driver` |
| `discount_amount` | hidden | Default 0 |
| `has_return` | hidden | Boolean for round/return trips |

**Customer Info** (Section 2):
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | email | Yes | Pre-filled from account |
| `mobile` | tel | Yes | Pre-filled from profile |
| `first_name` | text | Yes | Pre-filled from profile |
| `last_name` | text | Yes | Pre-filled from profile |

**Complete Address** (Section 3):
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `address` | text | Yes | House / Street / Barangay |
| `city` | text | Yes | |
| `province` | text | Yes | |
| `zip` | text | Yes | |
| `country` | select | Yes | Full country list, pre-filled Philippines |

**Locations** (Section 4 — Self-Drive and Both):
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `pickup_location` | text | — | e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila |
| `dropoff_location` | text | — | e.g. 123 Rizal St., Brgy. San Antonio, Makati City, Metro Manila |
| `destination` | text | — | e.g. Quezon City, Metro Manila |
| `purpose_of_travel` | hidden | — | Populated by purpose-select |
| (UI only) `purpose-select` | select | — | Leisure/Vacation, Business/Work, Family Event, Funeral/Bereavement, Medical/Health, School/Educational, Moving/Relocation, Airport Transfer, Other |
| (UI only) custom purpose | text | — | "Describe your purpose of travel...", shown when Other selected |

**Geocoded Location Fields** (hidden lat/lng pairs, Section 4):
| Field | Type |
|-------|------|
| `pickup_lat` | hidden |
| `pickup_lng` | hidden |
| `dropoff_lat` | hidden |
| `dropoff_lng` | hidden |

These also have address-autocomplete text inputs with placeholder "Start typing an address…"

**Additional Notes** (optional):
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `notes` | textarea | No | Any special requests, notes for the admin, accessibility needs, etc. |

---

### Self-Drive Booking Form

**Section 1 — Rental Details**:
- Rental Type: Self-Drive (selected) / With Driver (toggle)
- Start Date & Time: date picker (`start_datetime` hidden)
- End Date & Time: date picker (`end_datetime` hidden)
- Availability indicator

**Section 5 — Payment**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Payment option | select | Yes | BDO (010960093346) · Bank Transfer, G-Cash (09064961248) · E-Wallet |
| `payment_amount` | number | No | Pre-filled with security deposit amount |
| `reference_number` | text | No | Transaction / Ref # |
| `receipt_image` | file | No | JPG, PNG, WEBP, PDF - max 5 MB. Drag & drop or click |

**Document Gate**: Self-drive bookings require Driver's License and Valid ID uploaded to profile. If missing, form shows:
> "You cannot submit a self-drive booking until the following documents are uploaded to your profile."
> Driver's License - missing
> Valid ID - missing
> [Complete your documents →]

Submit button disabled until documents uploaded.

**Price Summary** (Self-Drive):
```
Base (1d × ₱5,200)  →  ₱5,200.00
Total                →  ₱5,200.00
Security Deposit (10%) → − ₱520.00
  (due now, non-refundable)
Remaining Balance    →  ₱4,680.00
```

- Security deposit is auto-set to 10% of base rental (admin-configurable)
- Security deposit is deducted from total (paid now, non-refundable)
- Remaining balance is due at pickup/release

---

### With-Driver Booking Form (Pickup & Drop-off)

**Section 1 — Rental Details**:
- Rental Type: Self-Drive / With Driver (selected)
- **Sub-mode radio**:
  - "Just a drop-off" — one-way, charged by distance
  - "Keep the car" — round/return, charged per day
- Pick-up Date & Time (only date shown for "Just a drop-off")
- End Date & Time (only for "Keep the car")

**Section 4 — Pickup & Drop-off** (replaces full locations section):
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| `pickup_location` | text | Yes | Start typing an address… (with autocomplete) |
| `dropoff_location` | text | Yes | Start typing an address… (with autocomplete) |
| `pickup_lat` | hidden | — | Geocoded |
| `pickup_lng` | hidden | — | Geocoded |
| `dropoff_lat` | hidden | — | Geocoded |
| `dropoff_lng` | hidden | — | Geocoded |

> "Pickup & drop-off only, with a professional driver — the fare is based on the driving distance between your two locations. No driver's license needed."

**Price Summary** (With-Driver — Just a Drop-off):
```
Enter pick-up & drop-off to see the fare.
```
Price is computed dynamically from distance between pickup and drop-off locations.

**Price Summary** (With-Driver — Keep the car):
```
Base (1d × ₱5,200)  →  ₱X,XXX.00
Driver (1d × ₱1,800) →  ₱X,XXX.00
Total                →  ₱X,XXX.00
```

- No security deposit for with-driver bookings
- No document gate (no driver's license needed)
- No payment form on this page (payment handled on admin side or separately)

---

### Both (Toggleable) Booking Form

When `type=both`, the form shows the Self-Drive layout by default with a toggle to switch between Self-Drive and With-Driver:
- **Self-Drive mode**: Sections 1-5 (full form with payment + docs gate)
- **With-Driver mode**: "Just a drop-off" / "Keep the car" sub-modes (simplified)

The form dynamically shows/hides sections when toggling.

---

## Booking Flow Summary

```
Vehicle Detail Page (/our-fleet/{slug})
  │  Quick Estimate (dates + rental type)
  │  "Book Now"
  ▼
Booking Form (/dashboard/book/{vehicle_id}?type=...)
  │  Fill sections based on rental type
  │
  │  ┌─ Self-Drive ──────────────────────────┐
  │  │ Document gate check                    │
  │  │ Rental type + dates                   │
  │  │ Customer info (pre-filled)            │
  │  │ Address (pre-filled)                  │
  │  │ Locations (pickup/dropoff/destination)│
  │  │ Purpose of travel                     │
  │  │ Payment (method, amount, ref, receipt)│
  │  │ Notes                                 │
  │  │ Submit → Admin review                 │
  │  └───────────────────────────────────────┘
  │
  │  ┌─ With-Driver ────────────────────────┐
  │  │ Sub-mode: Just a drop-off / Keep car │
  │  │ Date(s)                              │
  │  │ Customer info (pre-filled)            │
  │  │ Address (pre-filled)                  │
  │  │ Pickup + Dropoff only                │
  │  │ Notes                                │
  │  │ Submit → Admin review                │
  │  └───────────────────────────────────────┘
  │
  ▼
Save booking
  │  Booking created, status: "For Review"
  │  Redirect to dashboard or booking confirmation
  ▼
Dashboard → My Bookings Tab
  │  Booking appears in list
  │  Status progresses: For Review → Awaiting Docs →
  │  Pending Price Approval → Confirmed → On Trip → Completed
```

---

## What Needs to Be Built (Per User Requirements)

1. **Booking Detail View** — customer can click a booking and see full breakdown (vehicle, dates, locations, price, documents, status timeline)
2. **Feedback/Review on Completed Bookings** — star rating + text review, shown on booking detail and potentially public testimonials
3. **My Profile** — already exists but may need enhancements (saved addresses, payment methods)
4. **Documents** — already exists, auto-save works
5. **Logout** — already exists, works
