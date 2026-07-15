# Katada Rentals Consolidated Modules PRD

## Problem Statement

Katada Rentals needs one coherent product scope that connects the public website, customer portal, admin operations, booking lifecycle, payments, documents, reports, settings, and the new rental models into a single implementation plan.

The current documentation is split between customer and admin views. The customer documentation describes a dashboard, booking flow, documents, profile management, and gaps such as booking details, reviews, invoices, payments, and notifications. The admin documentation describes operations, settings, reports, and a newer rental-model requirement for All In, All Out, and Self Drive bookings. These need to be consolidated so the app can be built as one connected rental platform instead of isolated screens.

## Solution

Build a unified Katada Rentals platform with these modules:

- Public marketing and fleet browsing
- Authentication and customer onboarding
- Customer dashboard and booking management
- Customer document management
- Customer profile management
- Booking creation and lifecycle management
- Admin dashboard and operations
- Admin customer management
- Admin fleet and rate management
- Payments, invoices, and manual verification
- Rental model pricing for All In, All Out, and Self Drive
- Distance, toll, and fuel estimate support
- Post-trip reconciliation
- Reports and analytics
- Settings, content, integrations, team, and subscription management
- Email notifications and logs

The product should preserve the existing CarRentSaaS/Katada flows where they already work, close the documented customer gaps, and treat the new rental models as the target booking model.

## MVP Scope

MVP means every functional module documented in `docs/customer.md` and `docs/admin.md`. Nothing in those two source docs is treated as a later-phase feature unless it is explicitly listed in Out of Scope.

MVP includes:

- Public pages: homepage, fleet, vehicle detail, contact, login, terms, and privacy.
- Customer auth: registration, Google OAuth, email/password login, OTP verification, remember me, and logout.
- Customer onboarding: address collection and document upload.
- Customer dashboard: overview, KPIs, recent bookings, booking list, documents, profile, password, and notifications entry point.
- Customer booking flow: quick estimate, booking form, rental-type-specific fields, document gates, payment/deposit capture, and booking submission.
- Customer booking management: booking detail, price breakdown, route/location details, document status, status timeline, cancellation where allowed, payment status, invoice download, and completed-booking feedback/review.
- Admin dashboard: KPIs, upcoming rentals, top vehicles, recent bookings, recent signups, and login activity.
- Admin bookings: list/calendar views, filtering, search, detail, status updates, start trip, extend rental, cancel, delete, invoice download, walk-in booking, and guest booking.
- Admin customers: list, search, export, profile, booking history, email log, documents, new booking, login as customer, deactivate, and delete.
- Admin feedback: view after-trip customer feedback, mark reviewed, approve for testimonial use, and hide from testimonial use.
- Admin fleet: vehicles, brands, vehicle types, filters, rental options, pickup/drop-off support, base price, driver rate, status, and fuel-consumption override.
- Rental models: All In, All Out, and Self Drive pricing and requirements.
- Route pricing: geocoding, distance estimate, toll estimate, fuel estimate, API provider settings, and manual fallback/override.
- Payments: manual payment methods, receipts, verification, paid amount, remaining balance, and payment history.
- Post-trip reconciliation: actual toll, actual diesel, difference calculation, refund/credit or balance due, and final invoice.
- Reports: revenue, payment methods, top vehicles, top customers, payment transactions, and vehicle utilization.
- Settings: profile, password, subscription, business, team, payments, customer documents, integrations, pickup/drop-off, email log, content, domain, email, and help/guides.
- Subscription: plan display, usage limits, feature list, upgrade, cancellation, and payment history.
- Email automation: booking creation emails, SMTP settings, queued delivery, and searchable email logs.

## User Stories

1. As a visitor, I want to view the homepage, so that I can understand Katada Rentals before creating an account.
2. As a visitor, I want to browse available vehicles, so that I can choose a van before booking.
3. As a visitor, I want to filter vehicles by date, location, brand, type, rental option, and status, so that I can find the right vehicle faster.
4. As a visitor, I want to open a vehicle detail page, so that I can see specs, description, pricing, and rental options.
5. As a visitor, I want to use a quick estimate tool, so that I can preview pricing before starting a booking.
6. As a visitor, I want to contact the business, so that I can ask questions before booking.
7. As a visitor, I want to read terms and privacy pages, so that I understand the rental rules and data policy.
8. As a customer, I want to register with email and password, so that I can manage bookings online.
9. As a customer, I want to register or sign in with Google, so that I can access the portal faster.
10. As a customer, I want to verify my email with OTP, so that my account is trusted.
11. As a customer, I want to complete my address during onboarding, so that booking forms can be pre-filled.
12. As a customer, I want to upload required documents during onboarding, so that I can become eligible for restricted rental types.
13. As a customer, I want to log in with remember-me support, so that I do not need to reauthenticate often.
14. As a customer, I want to log out safely from all customer navigation areas, so that my account remains secure.
15. As a customer, I want to see a dashboard overview, so that I can quickly understand my booking activity.
16. As a customer, I want to see total, active, under-review, and completed booking counts, so that I understand my rental status.
17. As a customer, I want to see recent bookings, so that I can quickly continue from the dashboard.
18. As a customer, I want a Book Now entry point from the dashboard, so that I can start a new booking easily.
19. As a customer, I want to view all my bookings, so that I can track upcoming and past rentals.
20. As a customer, I want to filter my bookings by status, so that I can find bookings needing action.
21. As a customer, I want to see booking reference, vehicle, dates, duration, total, and status, so that I can understand each booking from the list.
22. As a customer, I want to open a booking detail page, so that I can see the full booking breakdown.
23. As a customer, I want to see pickup, drop-off, destination, purpose, notes, and route data on booking details, so that I know what was booked.
24. As a customer, I want to see price line items, paid amount, remaining balance, and deposit/down-payment status, so that I understand what I owe.
25. As a customer, I want to see document status per booking, so that I know whether admin is waiting on me.
26. As a customer, I want to see a booking status timeline, so that I understand where the booking is in the lifecycle.
27. As a customer, I want to cancel eligible bookings, so that I can stop a booking before the trip when allowed.
28. As a customer, I want to download invoices, so that I have proof of charges and payments.
29. As a customer, I want to see payment status and outstanding balance, so that I know whether I need to pay.
30. As a customer, I want to submit manual payment reference details and receipts, so that admins can verify my payment.
31. As a customer, I want to rate completed bookings, so that I can share feedback.
32. As a customer, I want to submit written feedback for completed bookings, so that Katada can improve service.
33. As a customer, I want approved feedback to be usable as testimonials, so that my public review can help future customers.
34. As a customer, I want to manage my profile photo, so that my account feels personalized.
35. As a customer, I want to update my name, mobile number, address, city, province, zip, and country, so that my booking information stays accurate.
36. As a customer, I want to change my password, so that I can keep my account secure.
37. As a customer, I want password visibility toggles, so that I can avoid mistyping passwords.
38. As a customer, I want to upload a driver's license, valid ID, and proof of billing one at a time, so that slow connections do not block document completion.
39. As a customer, I want document uploads to auto-save, so that I do not lose uploads by forgetting a submit button.
40. As a customer, I want document requirements to change based on rental type and admin settings, so that I only provide what is required.
41. As a customer, I want missing document gates to block Self Drive bookings, so that I do not submit a booking that admin cannot approve.
42. As a customer, I want to book an All In rental, so that van, driver, fuel estimate, and toll estimate are included.
43. As a customer, I want to book an All Out rental, so that I get van and driver while handling fuel and toll myself.
44. As a customer, I want to book a Self Drive rental, so that I can drive the van without a driver.
45. As a customer, I want rental forms to show only fields relevant to my selected rental type, so that booking is not confusing.
46. As a customer, I want pickup and drop-off address autocomplete, so that location entry is faster and more accurate.
47. As a customer, I want pickup and drop-off locations geocoded, so that distance, duration, tolls, and fees can be calculated.
48. As a customer, I want an All In quote to include van, driver, diesel estimate, toll estimate, and total, so that I know the expected full-service cost.
49. As a customer, I want to be told that All In fuel and toll are reconciled after the trip, so that final charges are not surprising.
50. As a customer, I want an All Out quote to include van and driver only, so that I know fuel and toll are excluded.
51. As a customer, I want a Self Drive quote to include van, delivery fee, recovery fee, and total, so that I know optional logistics costs.
52. As a customer, I want Self Drive down payment to be calculated automatically, so that I know what is due now.
53. As a customer, I want remaining balance to be calculated after deposit or down payment, so that settlement is clear.
54. As a customer, I want booking confirmation emails, so that I have a copy of booking details.
55. As an admin, I want a dashboard with booking, active rental, review, and revenue KPIs, so that I can monitor operations.
56. As an admin, I want to see upcoming rentals, top vehicles, recent bookings, recent signups, and login activity, so that I can manage daily work.
57. As an admin, I want to list bookings in table and calendar views, so that I can manage operations by workflow or schedule.
58. As an admin, I want to filter bookings by status and search by booking number or customer name, so that I can find records quickly.
59. As an admin, I want to create a booking for a customer, so that I can support phone and walk-in bookings.
60. As an admin, I want to create guest bookings without customer login, so that walk-in customers can still rent.
61. As an admin, I want to view booking details, so that I can verify customer, vehicle, route, pricing, documents, and payments.
62. As an admin, I want to approve or reject bookings, so that only valid rentals proceed.
63. As an admin, I want to move bookings through For Review, Awaiting Documents, Pending Price Approval, Confirmed, On Trip, and Completed, so that status reflects reality.
64. As an admin, I want to cancel bookings with a type and reason, so that cancellations are auditable.
65. As an admin, I want to release the unit and start the trip after collecting balance, so that payment and trip state change together.
66. As an admin, I want to upload payment receipts during start-trip, so that manual payments have evidence.
67. As an admin, I want to extend rentals with new end date, amount, reason, and optional payment, so that late returns or extensions are tracked.
68. As an admin, I want to delete bookings only when appropriate, so that operational data is not lost casually.
69. As an admin, I want to download invoices, so that I can provide official booking documents.
70. As an admin, I want to enter actual tolls after All In trips, so that reconciliation can compare estimate and actual cost.
71. As an admin, I want to enter actual diesel after All In trips, so that final fuel cost is accurate.
72. As an admin, I want final reconciliation to calculate owed balance or refund/credit, so that settlement is fair.
73. As an admin, I want to generate final invoices after reconciliation, so that customers receive complete trip breakdowns.
74. As an admin, I want to view customers, so that I can manage customer accounts.
75. As an admin, I want to search customers and export CSV, so that I can inspect or report on customer data.
76. As an admin, I want to see customer verification, auth method, mobile, address, bookings, and total spent, so that I understand customer history.
77. As an admin, I want to open customer profiles, so that I can review bookings, email logs, and documents.
78. As an admin, I want to login as a customer, so that I can support customer issues.
79. As an admin, I want to deactivate customers, so that risky or inactive accounts can be blocked.
80. As an admin, I want to create a new booking from a customer profile, so that repeat bookings are faster.
81. As an admin, I want to manage fleet vehicles, so that inventory and pricing stay accurate.
82. As an admin, I want to manage brands and vehicle types, so that fleet data stays organized.
83. As an admin, I want to set each vehicle's rental options, pickup/drop-off support, base price, driver rate, and availability, so that customer booking options match operations.
84. As an admin, I want to configure vehicle fuel consumption overrides, so that fuel estimates are vehicle-specific.
85. As an admin, I want to configure diesel price per liter, so that All In estimates use current rates.
86. As an admin, I want to configure reservation/down-payment percentage, so that Self Drive deposits match policy.
87. As an admin, I want to configure delivery and recovery fee rules, so that Self Drive logistics can be priced.
88. As an admin, I want to configure distance and toll API providers and keys, so that route estimates work.
89. As an admin, I want to manually override computed prices, so that edge cases can be handled.
90. As an admin, I want manual toll fallback, so that bookings can proceed when APIs are unavailable.
91. As an admin, I want to manage manual payment methods, so that customers know how to pay.
92. As an admin, I want to configure online gateways when available, so that payment collection can grow later.
93. As an admin, I want to verify payment transactions, so that revenue reports count only trusted payments.
94. As an admin, I want revenue reports by period, so that I can understand business performance.
95. As an admin, I want revenue breakdowns by day, method, vehicle, customer, and transaction, so that I can audit income.
96. As an admin, I want vehicle utilization reports, so that I can see booking count and active use per vehicle.
97. As an admin, I want to update profile and password settings, so that my admin account is current and secure.
98. As an admin, I want to configure business profile, branding, address, TIN, VAT, and currency, so that documents and public pages reflect the business.
99. As an admin, I want to manage team members and roles, so that staff can help operate the platform.
100. As an admin, I want staff permissions to prevent unsafe deletes, so that junior staff cannot remove critical data.
101. As an admin, I want to configure customer document capture mode, so that document requirements match business policy.
102. As an admin, I want to configure analytics integrations, so that ads and tracking can be connected.
103. As an admin, I want to configure pickup and drop-off service points and radius, so that service coverage is controlled.
104. As an admin, I want to search and filter email logs, so that I can troubleshoot communication.
105. As an admin, I want to customize SEO, header, hero, fleet, testimonials, FAQ, and CTA content, so that the public site can be managed without code.
106. As an admin, I want approved customer reviews to feed testimonials, so that public proof stays fresh.
107. As an admin, I want to view after-trip customer feedback in one module, so that I can monitor trip quality.
108. As an admin, I want to mark feedback as reviewed, approved for testimonial use, or hidden, so that only selected feedback appears publicly.
109. As an admin, I want to configure domain and email settings, so that the tenant can run under the correct brand.
110. As an admin, I want help and guide content, so that I can learn platform operations.
111. As an admin, I want to view subscription plan, usage limits, feature list, and payment history, so that I know account capacity.
112. As an admin, I want upgrade and cancellation flows, so that plan changes are self-service.
113. As the system, I want to store booking route distance and duration, so that pricing and details are reproducible.
114. As the system, I want to store toll estimate and toll segments, so that All In quotes can be explained.
115. As the system, I want to store fuel estimate inputs, so that fuel pricing can be audited later.
116. As the system, I want to queue booking emails, so that user-facing flows are not blocked by email delivery.
117. As the system, I want to preserve booking status history, so that customer and admin timelines are accurate.
118. As the system, I want to preserve payment and receipt records, so that manual verification is auditable.
119. As the system, I want to enforce plan limits, so that tenant usage respects subscription capacity.

## Implementation Decisions

- Treat `customer.md` as the newer source for customer portal existence and behavior.
- Treat `admin.md` as the source for admin operations, settings, reporting, and the new rental models.
- Consolidate existing Self-Drive / With Driver concepts into the target rental model taxonomy: All In, All Out, and Self Drive.
- Keep booking lifecycle statuses: For Review, Awaiting Documents, Pending Price Approval, Confirmed, Rejected, Canceled, On Trip, Completed.
- Build customer booking details as a first-class module because both docs identify customer booking visibility as a key gap.
- Build feedback/reviews only for completed bookings.
- Reviews should require admin approval before being reused publicly as testimonials.
- Add an admin View Feedback module for after-trip feedback review and testimonial approval.
- Keep documents profile-level initially, but display their status in booking context when required by the rental type.
- Self Drive requires Driver's License, Valid ID, and Proof of Billing before submission or confirmation.
- All In includes van, driver, diesel estimate, toll estimate, and post-trip reconciliation.
- All Out includes van and driver only; fuel and toll are excluded.
- Self Drive includes van only, optional delivery fee, optional recovery fee, and mandatory down payment.
- Use OpenRouteService as the default distance provider because the documented free tier fits current scale.
- Support Google Distance Matrix as a backup provider.
- Use TollGuru as the preferred toll provider because the docs call out Philippines toll-road support.
- Support Google Routes tollInfo or manual toll entry as fallback.
- Keep fuel price manual in admin settings; do not depend on scraping for the core flow.
- Store route distance, route duration, toll estimate, toll segments, fuel estimate, and calculation inputs on the booking record.
- Allow admin price overrides for computed distance, toll, fuel, delivery, recovery, and total fields.
- Manual payment verification is the primary payment model for the current scope.
- Online payment gateways can be configured but should not block the manual payment flow.
- Invoices must reflect estimates, payments, remaining balances, and final reconciliation when available.
- Customer dashboard should include overview, bookings, documents, profile, notifications, and booking detail views.
- Admin should have dashboard, bookings, customers, fleet, reports, settings, subscription, and email log modules.
- Email notifications should be sent on booking creation and include rental-type-specific details.
- Admin-created bookings must support both registered customers and guests.
- Content settings should drive public homepage sections where practical.
- Subscription limits should be visible in admin and enforced for bookings, vehicles, team members, and storage.

## Module Breakdown

- Public Site Module: homepage, fleet listing, vehicle detail, quick estimate, contact, terms, privacy.
- Authentication Module: login, register, Google OAuth, OTP verification, remember me, logout.
- Customer Onboarding Module: address collection and initial document upload.
- Customer Dashboard Module: overview metrics, recent bookings, navigation, notifications entry point.
- Customer Bookings Module: booking list, filters, booking detail, status timeline, cancellation, invoice download, payment status.
- Booking Creation Module: rental type selection, route entry, pricing preview, document gates, payment/deposit capture, notes.
- Documents Module: driver's license, valid ID, proof of billing, auto-save uploads, document status.
- Profile Module: customer photo, personal info, address, password.
- Reviews Module: completed-booking rating, written review, admin approval, testimonial reuse.
- Admin Feedback Module: feedback list, feedback detail, review status, testimonial approval, hidden status.
- Admin Dashboard Module: KPIs, upcoming rentals, top vehicles, recent bookings, signups, login activity.
- Admin Bookings Module: list/calendar, filters, detail, status changes, start trip, extend, cancel, delete, invoices.
- Pricing Engine Module: All In, All Out, Self Drive calculations with a small interface that accepts booking inputs and returns line items and totals.
- Route Cost Module: geocoding, distance, duration, toll estimates, provider fallback, manual fallback.
- Reconciliation Module: actual toll/diesel entry, variance calculation, final invoice adjustments.
- Payments Module: manual payment methods, receipts, verification, payment history, balance tracking.
- Customers Module: customer list, search, export, profile, documents, booking history, impersonation, deactivate/delete.
- Fleet Module: vehicles, brands, types, rental options, rates, availability, pickup/drop-off capability, fuel-consumption override.
- Reports Module: revenue, payment transactions, payment methods, top vehicles, top customers, utilization.
- Settings Module: admin profile, password, business, team, payments, documents, integrations, pickup/drop-off, content, domain, email, help.
- Subscription Module: plan display, limits, feature list, upgrade, cancellation, payment history.
- Email Module: SMTP configuration, queued transactional emails, searchable email log.

## Testing Decisions

- Test external behavior and business rules, not implementation details.
- Pricing Engine should have isolated tests for All In, All Out, Self Drive, down payment, delivery/recovery fees, and remaining balance calculations.
- Route Cost should have tests for provider success, provider failure, zero-toll routes, and manual fallback.
- Booking Creation should have tests for document gates, rental-type-specific required fields, and status creation as For Review.
- Booking Lifecycle should have tests for valid status transitions, cancellation from allowed stages, start-trip payment capture, extension, and completion.
- Reconciliation should have tests for actual greater than estimate, actual lower than estimate, and final invoice output values.
- Payments should have tests for receipt upload metadata, manual verification, paid amount, and remaining balance.
- Customer Booking Detail should have tests that a customer can only view their own bookings.
- Reviews should have tests for completed-booking-only submission and admin approval before public display.
- Admin Feedback should have tests for visibility of submitted feedback and status changes to reviewed, approved, or hidden.
- Documents should have tests for auto-save upload behavior and required document status by rental type.
- Admin Customers should have authorization tests for impersonation, deactivate, and delete behavior.
- Reports should have tests that only verified payments affect revenue.
- Settings should have tests for validation of numeric rates, API provider configuration, and document capture mode.
- Email should have tests that booking emails are queued with rental-type-specific content.

## Out of Scope

- Building native mobile apps.
- Real-time GPS trip tracking.
- Automated DOE fuel-price scraping as a required feature.
- Fully automated toll accuracy guarantees for every Philippine route.
- Complex loyalty, rewards, or promo-code systems.
- Multi-tenant platform owner administration beyond the tenant subscription views already documented.
- Producing the 39 help videos.
- Replacing manual payment verification with a fully online payment-first flow.
- Advanced accounting exports beyond CSV and invoice/payment reports.

## Further Notes

- The docs contain a conflict: `customer.md` documents customer dashboard routes, while `admin.md` lists the customer portal and customer dashboard routes as gaps. This PRD assumes the customer documentation is newer or target-state documentation.
- The current React app already has basic customer and admin routes, but many modules are placeholders rather than full behavior.
- The platform typo `Katada Transportation Sevices` should be corrected to `Katada Transportation Services` wherever tenant-facing content is managed.
- Implementation can still be sequenced, but MVP scope remains everything documented in `docs/customer.md` and `docs/admin.md` except the explicit Out of Scope items above.
