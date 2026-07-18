export const faqs = [
  {
    question: 'What types of rentals does Katada offer?',
    answer: 'Three models: All In (van, driver, fuel estimate, and toll estimate included), All Out (van and driver only — you handle fuel and toll), and Self Drive (van only — you drive, with optional delivery and recovery fees).',
  },
  {
    question: 'How does pricing work?',
    answer: 'Every booking shows a price breakdown before you confirm. All In quotes include van, driver, diesel estimate, and toll estimate. Self Drive requires a down payment. Admin provides the final quote after reviewing your route.',
  },
  {
    question: 'What documents do I need?',
    answer: "Self Drive bookings require a Driver's License, a valid government ID, and Proof of Billing. These are not required for All In or All Out rentals where Katada provides a driver.",
  },
  {
    question: 'How do I make a booking?',
    answer: 'Create an account, browse the fleet, pick dates and a rental type, fill in your route details, upload any required documents, and submit. Admin reviews your request and confirms the price.',
  },
  {
    question: 'Can I cancel or modify a booking?',
    answer: 'Cancellations depend on the booking status. Bookings in For Review, Awaiting Documents, or Accepted stages can be cancelled. Once a trip has started, cancellations are not available. Contact us for modifications.',
  },
  {
    question: 'How do payments work?',
    answer: 'Payments are manual — bank transfer (BDO) or G-Cash. After submitting your booking, you will receive payment instructions. Upload your receipt and admin verifies it. Remaining balance is due at pickup.',
  },
  {
    question: 'Is there a delivery fee for Self Drive?',
    answer: 'Yes, if you need the van delivered to your location or recovered after the trip, a delivery and recovery fee applies. The amount depends on distance and is shown in your quote before you confirm.',
  },
]

export const navLinks = [
  { label: 'Our Fleet', href: '/our-fleet' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Fleet', href: '#fleet' },
  { label: 'Services', href: '#services' },
  { label: 'Why Katada', href: '#why' },
]

export const fleet = [
  {
    name: 'Grandia VIP',
    seats: '10 seats',
    price: 'From PHP 6,500/day',
    image: '/van-2.jpg',
    note: 'Captain seats, wide cabin, premium ride for long trips.',
  },
  {
    name: 'Commuter Deluxe',
    seats: '14 seats',
    price: 'From PHP 3,500/day',
    image: '/van-1.jpg',
    note: 'Roomy everyday van for barkadas, teams, and family outings.',
  },
  {
    name: 'Super Grandia',
    seats: '10 seats',
    price: 'From PHP 5,000/day',
    image: '/vehicle-sample.jpg',
    note: 'Quiet cabin and recliners for airport and business transfers.',
  },
]

export const services = [
  { title: 'Airport transfers', body: 'Pickup and drop-off for NAIA, hotels, and homes.', icon: 'Luggage' },
  { title: 'Out-of-town trips', body: 'Comfortable vans for Baguio, Tagaytay, Subic, and beyond.', icon: 'MapPin' },
  { title: 'Events and groups', body: 'Shuttle service for weddings, retreats, reunions, and company days.', icon: 'Users' },
  { title: 'Driver included', body: 'Licensed drivers who know the routes and keep the trip steady.', icon: 'ShieldCheck' },
  { title: 'Flexible schedules', body: 'Early call times, late arrivals, and multi-stop itineraries covered.', icon: 'Clock3' },
]

export const proof = [
  { value: '24/7', label: 'trip support' },
  { value: '10-14', label: 'seat options' },
  { value: 'Pasay', label: 'home base' },
]
