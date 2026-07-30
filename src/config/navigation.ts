export interface HeaderNavItem {
  label: string
  to: string
  end?: boolean
}

export const publicHeaderLinks: HeaderNavItem[] = [
  { label: 'Services', to: '/#services' },
  { label: 'Why Katada', to: '/#why' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact', to: '/#contact' },
  { label: 'Our Fleet', to: '/our-fleet' },
  { label: 'Terms', to: '/terms' },
  { label: 'Privacy', to: '/privacy' },
]

export const customerAccountLinks: HeaderNavItem[] = [
  { label: 'Dashboard', to: '/dashboard', end: true },
  { label: 'My Bookings', to: '/bookings' },
  { label: 'Documents', to: '/documents' },
  { label: 'My Profile', to: '/profile' },
]

export const adminHeaderLinks: HeaderNavItem[] = [
  { label: 'Dashboard', to: '/admin', end: true },
]
