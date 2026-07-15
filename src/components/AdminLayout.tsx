import { NavLink, Outlet } from 'react-router-dom'

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/fleet', label: 'Our Fleet' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 border-r border-gray-200 bg-white p-4">
        <a href="/" className="block text-lg font-bold text-gray-900 mb-8">
          Katada Van Rentals
        </a>
        <nav className="space-y-1">
          {sidebarLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <NavLink
            to="/profile"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            My Profile
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
