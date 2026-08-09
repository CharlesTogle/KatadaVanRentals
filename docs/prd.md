# Katada Van Rentals — PRD

## Problem Statement

Van rental businesses in the Philippines operate across three distinct service models — full-service (driver, fuel, tolls included), driver-only, and self-drive — yet no off-the-shelf rental platform handles them all. Customers need a single place to browse vans, get route-aware pricing with Philippine toll and fuel estimates, and manage bookings and documents. Business operators need tools to manage fleet, bookings, payments, customers, and post-trip reconciliation across all three rental models.

## Solution

Katada Van Rentals is a single-tenant web platform comprising a public marketing site, a customer portal, and an admin operations panel, all backed by Supabase (Postgres, Auth, Edge Functions). It supports three rental models — **All In** (van + driver + fuel estimate + toll estimate, reconciled post-trip), **All Out** (van + driver only), and **Self Drive** (van only, with deposit) — with route-aware pricing powered by OpenRouteService distance calculations and Philippine toll data.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite, Tailwind CSS v4, Zustand (auth store), TanStack React Query (server state), React Router v7, Leaflet (maps), Chart.js (reports)
- **Backend**: Supabase — Postgres database with RLS, Auth (email/password + Google OAuth), Edge Functions (TypeScript/Deno), Storage (customer documents, payment receipts, vehicle images, invoices)
- **Email**: Resend API via `send-email` edge function
- **Route/Location APIs**: OpenRouteService (geocoding, directions), expressway.ph (Philippine tolls)
- **PDF Generation**: Client-side via html2pdf.js

## MVP Scope

Everything documented below is implemented and operational.

---

## Public Site

### Landing Page
A scrollable single-page marketing site with sections drawn from admin content settings:
- **Hero**: headline, subheadline, CTA buttons, background image
- **Fleet**: featured vehicles grid with image, name, capacity, transmission, price
- **Services**: three rental model cards (All In, All Out, Self Drive) with descriptions
- **Why Us**: feature highlight cards
- **Testimonials**: customer reviews with admin-approved testimonial status
- **FAQ**: expandable question/answer pairs
- **Contact**: name, phone, email, message form that writes to `contact_inquiries`

### Fleet Browsing
- `/our-fleet` — filterable grid of available vehicles by date range, location, brand, vehicle type, rental model support, status
- `/our-fleet/:slug` — vehicle detail page with specs, description, image gallery, pricing table per rental model, and a "Book Now" CTA

### Static Pages
- `/terms` — terms and conditions
- `/privacy` — privacy policy
- `/contact` — standalone contact form page

---

## Authentication

### Registration
- Email/password signup with email OTP verification via Supabase
- Google OAuth sign-in/sign-up
- Client-side rate limiting on login/register attempts

### Login
- Email/password login
- Google OAuth login
- "Remember me" via Supabase SDK session persistence
- Forgot password flow (email link → `/password/reset`)

### Onboarding
After initial registration, customers are guided through:
1. **Profile confirmation** (`/onboarding`) — first name, last name, phone number, and complete address must match the saved profile
2. **Rental preference** — customers choose whether they intend to self drive a van
3. **Conditional document upload** — self-drive customers upload a driver's license and valid ID; each document is saved automatically
4. **Completion** — customers see a welcome screen and continue to the dashboard

### Roles
- `customer` — default new-user role
- `admin`, `manager`, `staff` — admin panel access roles with cascading permissions (only `admin` can delete customers)

---

## Customer Portal

Protected behind login. All routes wrapped in a shared customer layout with top navigation bar.

### Dashboard (`/dashboard`)
- KPI summary cards: total bookings, active, under review, completed counts
- "Book Now" button
- Recent bookings table (reference, vehicle, dates, duration, total, status)

### My Bookings (`/bookings`)
- Filterable list by status
- Booking card showing reference number, vehicle, dates, duration, total, status badge

### Booking Creation (`/dashboard/book/:vehicleId`)
A multi-section form in a single page:

1. **Vehicle & Dates** — vehicle display, pickup/drop-off date-time pickers
2. **Rental Model Selection** — All In / All Out / Self Drive toggle
3. **Route** — pickup address (autocomplete), destination address (autocomplete), drop-off address (autocomplete), trip purpose. Locations are geocoded via OpenRouteService for distance/duration calculation
4. **Pricing** — real-time price computation:
   - *All In*: van rate + driver rate + diesel estimate (distance ÷ km/L × fuel price) + toll estimate (via expressway.ph, with toll plaza selection and round-trip option) = total
   - *All Out*: van rate + driver rate = total (fuel/toll excluded)
   - *Self Drive*: van rate + optional delivery fee + optional recovery fee, with automatic down payment calculation (configurable percentage)
5. **Toll Confirmation** — for All In bookings, user selects which toll plazas (from detected candidates) are relevant to the route
6. **Customer Details** — pre-filled from profile, editable
7. **Notes** — free-text passenger count and special notes
8. **Price Summary** — line-item breakdown with subtotal, discounts, fees, estimated total
9. **Document Gate** — Self Drive bookings require driver's license, valid ID, and proof of billing; missing documents block submission
10. **Payment** — manual payment method selection with receipt upload
11. **Submit** — creates booking at `for_review` status, sends confirmation email

### Booking Detail (`/dashboard/bookings/:id`)
- Booking reference, vehicle, dates, rental model
- Pickup, destination, drop-off addresses with map display (Leaflet)
- Route distance, duration
- Toll breakdown (for All In)
- Price line items: subtotal, fees, discounts, estimated total, paid amount, remaining balance
- Document status per booking
- Status timeline (chronological status change history)
- Cancel button (available in `for_review` and `awaiting_documents` statuses only)
- Invoice download button (generates PDF client-side)
- Payment submission: upload receipt with reference number, channel, amount
- Post-trip feedback form (rating 1-5 + text, only for completed bookings)

### Profile (`/profile`)
- Profile photo upload
- Name fields (first, middle, last, suffix)
- Mobile number
- Address (line1, line2, street, barangay, city, province, zip code, country)
- Password change with visibility toggles

### Documents (`/documents`)
- Three document slots: driver's license, valid ID, proof of billing
- Each independently uploadable (auto-save on file selection)
- Status indicators (pending, uploaded, reviewed, rejected)
- Admin rejection reason display
- Booking-requested documents: admin can request additional document types per booking; customer uploads documents against those types

### Notifications (`/dashboard/notifications`)
- List of user notifications (title, body, read/unread state, timestamp)
- Mark-as-read
- Click-through link to relevant page

---

## Admin Panel

Protected behind login with admin/manager/staff role check. All routes prefixed `/admin` with an admin sidebar layout.

### Dashboard (`/admin`)
- KPI cards: total bookings, active rentals, pending reviews, total revenue
- Upcoming rentals list
- Top vehicles by booking count
- Recent bookings
- Recent customer signups
- Recent login activity

### Bookings (`/admin/bookings`)
- Table and calendar views
- Filters by status, search by booking number or customer name
- Each booking row: reference, customer, vehicle, dates, rental model, status, total, paid, balance
- Click through to booking detail

### Booking Detail (`/admin/bookings/:bookingNumber`)
- Customer info, vehicle info, rental model, dates, route details with map
- Price line items display
- Document status
- Payment history: list of submitted payments with receipt links, amounts, channels, verification status
- Payment verification: admin reviews receipt, verifies or rejects, amount auto-refreshes paid/remaining
- Status management (valid transitions):
  - `for_review` → `awaiting_documents` / `confirmed` / `rejected` / `canceled`
  - `awaiting_documents` → `pending_price_approval` / `confirmed` / `canceled`
  - `pending_price_approval` → `confirmed` / `canceled`
  - `confirmed` → `on_trip` / `canceled`
  - `on_trip` → `completed`
  - `completed` → terminal
  - `rejected` → terminal
  - `canceled` → terminal
- **Start Trip**: transitions to `on_trip`, collects remaining balance payment with receipt upload
- **Extend Rental**: new end date, extension amount, reason, optional payment receipt
- **Cancel**: cancel type and reason
- **Delete**: removes booking entirely (admin-only guard)
- **Price Adjustment**: admin proposes adjusted price, customer must accept via their portal
- **Invoice Download**: generates PDF with pricing, payments, business details
- **Post-Trip Reconciliation** (for All In): enter actual toll amount and actual diesel liters with receipt upload; system calculates variance and generates final invoice
- **Request Documents**: admin requests specific document types; customer sees and uploads in their portal

### Booking Creation (`/admin/bookings/create`)
- Customer selection: search existing customers (infinite scroll), or create new customer (with invite email)
- Guest booking support (no auth user required)
- Vehicle selection, dates, rental model, route (with same location autocomplete)
- Price preview with line-item breakdown
- Creates booking at `confirmed` status directly, sends invitation/confirmation email

### Customers (`/admin/customers`)
- Searchable, paginated table
- Columns: name, email, verification status, auth method, mobile, documents status, total bookings, total spent
- Filter by document completeness for self-drive eligibility
- Export to CSV
- Click through to customer detail

### Customer Detail (`/admin/customers/:customerId`)
- Profile info (name, email, phone, address)
- Booking history table
- Email communication log
- Document status (driver's license, valid ID, proof of billing)
- Actions: create new booking, login as customer (impersonation), deactivate customer, delete customer (blocks if bookings exist)

### Fleet (`/admin/fleet`)
- Vehicle table: image, name, plate, brand, type, status, base price
- Filters by brand, type, rental model support, availability
- Add vehicle button

### Fleet — New/Edit (`/admin/fleet/new`, or edit modal)
- Name, plate number, year, brand (dropdown), vehicle type (dropdown)
- Description, passenger count, bag count, transmission, fuel type
- Pricing: base price/day, excess rate/hour, auto full-day threshold, 12-hour rate, driver rate/day
- Fuel: km per liter (override per vehicle)
- Rental model toggles (All In, All Out, Self Drive)
- Pickup/drop-off support toggle
- Availability toggle
- Image upload (multiple, to vehicle-images bucket; JPEG, PNG, or WebP; max 10 MiB each)
- SEO meta title and description
- Car wash fee, delivery fee override, security deposit, discount

### Reports
- **Revenue** (`/admin/reports/revenue`): date range filter, summary metrics, revenue by day chart, breakdown by payment method, by vehicle, by customer, transaction-level detail table
- **Utilization** (`/admin/reports/utilization`): date range filter, vehicle list with booking count and active days

### User Feedback (`/admin/feedback`)
- All submitted post-trip feedback
- Rating (1-5 stars), feedback text, customer name, booking reference
- Status management: mark as reviewed, approve for testimonial use (appears publicly), hide from testimonial use

### Settings (`/admin/settings`)
Multi-tab settings page:
- **Profile**: admin name, email, profile photo
- **Password**: change admin password
- **Business**: business name, address, TIN, VAT, currency, logo, branding, support email/phone
- **Payments**: list of manual payment methods (channel, account details, instructions, QR image); online gateway configuration (placeholder)
- **Documents**: customer document capture mode (required-by-default vs wildcard)
- **Route & Pricing**: distance API provider (OpenRouteService), toll API provider (expressway.ph), API keys; fuel price per liter; default km per liter; peso per km fallback; reservation/down-payment percentage; delivery and recovery fee rules; manual pricing flag overrides
- **Pickup/Drop-off**: service area management (list, create, edit, delete) with address, coordinates, radius in km, active toggle
- **Content**: SEO defaults; landing page section content (header, hero, fleet, services, why-us, testimonials, FAQ, CTA, footer); social media links
- **Integrations**: analytics scripts, third-party keys
- **Email**: SMTP configuration (provider, from name, from address); email log (searchable, filterable, with delivery status and timestamps)
- **Subscription** (placeholder): plan name, feature list, usage limits, upgrade/cancel flows, payment history
- **Help**: guides and documentation links

---

## Rental Models & Pricing

### All In
- Van base rate + driver rate per day
- Diesel estimate = (route distance ÷ vehicle km/L) × fuel price per liter
- Toll estimate = computed from selected toll plazas via expressway.ph API
- Post-trip reconciliation: admin enters actual toll and diesel; variance computed; final invoice issued

### All Out
- Van base rate + driver rate per day
- Fuel and toll are excluded; no post-trip reconciliation

### Self Drive
- Van base rate per day
- Optional delivery fee (if van transported to pickup)
- Optional recovery fee (if van recovered from drop-off)
- Automatic down payment = total × reservation percentage (configurable in settings)
- Requires driver's license, valid ID, and proof of billing documents

### Route Pricing
- Pickup and drop-off addresses autocompleted via OpenRouteService geocoding (restricted to Philippines)
- Driving distance and duration computed via OpenRouteService directions API
- In-service-area check: pickup must fall within an active service point's radius
- Toll estimate: nearest toll plazas identified from hardcoded Philippine plaza database; costs computed via expressway.ph API; user confirms relevant plazas; round-trip option doubles toll
- Admin can override any computed price (manual pricing flag)

---

## Payments

### Manual Payment Methods
- Admin configures payment channels in settings (bank transfer, GCash, Maya, over-the-counter, etc.)
- Each method has channel type, account name, account number, branch, instructions, optional QR code image
- Customers see active methods at booking checkout and booking detail

### Payment Flow
- Customer submits payment with reference number, channel, amount, receipt image
- Payment appears in booking's payment history
- Admin verifies or rejects payment with reason
- Verified payments update paid amount and remaining balance on the booking
- Only verified payments count toward revenue reports

### Balance Tracking
- Total estimated price
- Paid amount (sum of verified payments)
- Remaining balance = total - paid
- Start trip requires balance ≤ 0 or payment collected at start

---

## Post-Trip Reconciliation (All In)

1. Booking completes → `trip_settlements` record created
2. Admin enters:
   - Actual toll amount (with receipt upload)
   - Actual diesel liters consumed (with receipt upload)
   - System computes diesel amount = liters × fuel price/L
3. System calculates variance = (actual toll + actual diesel) - (estimated toll + estimated diesel)
4. Positive variance → customer owes additional amount (adds to booking balance)
5. Negative variance → credit/refund noted
6. Final invoice generated with reconciliation breakdown

---

## Emails

- Sent via Resend API through the `send-email` Supabase edge function
- Edge function has IP-based rate limiting (10 requests per 60 seconds)
- All sent emails logged in `email_logs` table (recipient, subject, type, status, provider message ID, timestamp)
- Booking confirmation emails sent on customer booking creation and admin booking creation
- Admin booking creation also sends invitation email to new guest users
- CORS-restricted to allowed origins

---

## Database

All data stored in Supabase Postgres with Row-Level Security:

- **profiles** — extends auth.users with name, address, role, profile image
- **vehicles** — inventory with pricing, fuel specs, rental model support flags, images
- **brands** — vehicle brands
- **vehicle_types** — vehicle type labels
- **bookings** — core booking record with status, route, pricing, rental model
- **booking_status_events** — audit log of status transitions
- **booking_extensions** — rental extension records
- **booking_cancellations** — cancellation records with type and reason
- **booking_feedback** — post-trip ratings and reviews
- **booking_requested_document_types** — admin-requested document types per booking
- **booking_requested_documents** — customer uploads for requested documents
- **customer_documents** — driver's license, valid ID, proof of billing per customer
- **payments** — payment submissions with verification status
- **trip_settlements** — post-trip reconciliation data
- **invoices** — generated invoice records
- **payment_methods** — configured payment channels
- **app_settings** — singleton application configuration
- **service_points** — pickup/drop-off service areas
- **notifications** — user notification inbox
- **email_logs** — email delivery audit trail
- **contact_inquiries** — contact form submissions

RLS enforces: public read for brands, types, settings, active vehicles, active payment methods, approved testimonials; customer-only access to own profile, documents, bookings, payments, notifications; admin-only write to vehicles, settings, payment methods, service points, booking status changes.

---

## Out of Scope

- Native mobile apps
- Real-time GPS trip tracking
- Automated fuel-price scraping
- Loyalty/rewards/promo-code systems
- Multi-tenant platform administration beyond single-tenant settings
- Producing help videos
- Fully online/automated payment gateways (manual verification is the primary model)
- Advanced accounting exports beyond CSV and invoice PDF

---

## Further Notes

- The platform name is "Katada Van Rentals" (previously misspelled "Katada Transportation Sevices" in some legacy content).
- The OpenRouteService free tier and expressway.ph toll API are sufficient for current scale; Google Distance Matrix and TollGuru are configured as backup providers but not required for the default flow.
- Edge function rate limiting is implemented globally via a DB function; route-quote and location-suggest additionally check for in-service-area validity.
- Vehicle images, payment receipts, customer documents, and invoices are stored in Supabase Storage with signed URL access.
- Auth uses Supabase's built-in session management with automatic profile creation via DB trigger (`handle_new_user`).
- Invoice PDFs are generated client-side via html2pdf.js, not server-side, using business details from app_settings.
