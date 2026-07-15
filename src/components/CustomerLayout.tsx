import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/profile', label: 'Profile' },
  { to: '/bookings', label: 'My Bookings' },
  { to: '/documents', label: 'Documents' },
]

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/" className="text-lg font-bold text-gray-900">
            Katada Van Rentals
          </a>
          <nav className="flex items-center gap-4">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
