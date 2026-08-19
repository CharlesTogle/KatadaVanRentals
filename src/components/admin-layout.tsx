import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { useAppSettings } from '@/hooks/use-app-settings'
import { LogOut, LayoutDashboard, CalendarCheck, Users, Truck, BarChart3, Settings, Home, MessageSquareMore, Menu, X } from 'lucide-react'

const navGroups = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/feedback', label: 'User Feedback', icon: MessageSquareMore },
  { to: '/admin/fleet', label: 'Our Fleet', icon: Truck },
  { to: '/admin/reports/revenue', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: settings } = useAppSettings()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const name = user?.user_metadata?.full_name || user?.email || 'Admin'

  return (
    <div className="admin-shell min-h-screen bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Mobile sticky bar - matches customer shell */}
      {/* Mobile sticky bar - matches customer shell */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#071f52]/10 bg-white px-6 py-3 md:hidden">
          <button
            type="button"
            aria-label="Toggle admin menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
            className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <a href="/" className="ml-auto flex items-center gap-3">
            <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada'} className="h-8 w-8 rounded-lg object-cover ring-1 ring-[#071f52]/10" />
            <span className="text-sm font-extrabold text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</span>
          </a>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar - slides from right */}
      <aside className={`fixed bottom-0 left-0 top-0 z-40 w-[min(320px,100vw)] transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_18px_48px_rgba(7,31,82,0.08)]">
          <div className="flex items-center justify-between border-b border-[#071f52]/10 px-5 py-4">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Katada" className="h-8 w-8 rounded-lg object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-extrabold text-[#071f52]">Katada Van Rentals</span>
            </a>
            <button
              type="button"
              aria-label="Close admin menu"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
            {navGroups.map((group) => (
              <NavLink
                key={group.to}
                to={group.to}
                end={group.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-[#071f52] text-white'
                      : 'text-[#071f52]/64 hover:bg-[#071f52]/8 hover:text-[#071f52]'
                  }`
                }
              >
                <group.icon size={18} />
                {group.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-[#071f52]/10 px-3 py-4">
            <div className="rounded-xl bg-[#071f52]/6 px-3 py-2.5">
              <p className="text-xs font-bold text-[#071f52]">Admin Panel</p>
            </div>
            <NavLink
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#071f52]/64 transition-colors hover:bg-[#071f52]/8 hover:text-[#071f52]"
            >
              <Home size={18} />
              Home
            </NavLink>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              {profile?.profile_image_path ? (
                <img src={profile.profile_image_path} alt={name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071f52] text-xs font-black text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#071f52]">{name}</p>
                <p className="truncate text-xs font-medium text-[#071f52]/48">Admin</p>
              </div>
              <button onClick={handleSignOut} className="rounded-lg p-1.5 text-[#071f52]/40 transition-colors hover:text-[#e92935]">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex">
        {/* Desktop sidebar - original fixed left */}
        <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 shrink-0 border-r border-[#071f52]/10 bg-white md:flex md:flex-col">
          <div className="px-5 pb-4 pt-6">
            <a href="/" className="flex items-center gap-3">
              <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada'} className="h-9 w-9 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-extrabold text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</span>
            </a>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            {navGroups.map((group) => (
              <NavLink
                key={group.to}
                to={group.to}
                end={group.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-[#071f52] text-white'
                      : 'text-[#071f52]/64 hover:bg-[#071f52]/8 hover:text-[#071f52]'
                  }`
                }
              >
                <group.icon size={18} />
                {group.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-[#071f52]/10 px-3 py-4">
            <div className="rounded-xl bg-[#071f52]/6 px-3 py-2.5">
              <p className="text-xs font-bold text-[#071f52]">Admin Panel</p>
            </div>
            <NavLink
              to="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#071f52]/64 transition-colors hover:bg-[#071f52]/8 hover:text-[#071f52]"
            >
              <Home size={18} />
              Home
            </NavLink>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              {profile?.profile_image_path ? (
                <img src={profile.profile_image_path} alt={name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071f52] text-xs font-black text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#071f52]">{name}</p>
                <p className="truncate text-xs font-medium text-[#071f52]/48">Admin</p>
              </div>
              <button onClick={handleSignOut} className="rounded-lg p-1.5 text-[#071f52]/40 transition-colors hover:text-[#e92935]">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 md:pl-64">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
