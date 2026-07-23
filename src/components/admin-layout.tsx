import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { ChevronDown, LogOut, LayoutDashboard, CalendarCheck, Users, Truck, BarChart3, Settings, Menu, X, Home } from 'lucide-react'

const navGroups = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/fleet', label: 'Our Fleet', icon: Truck },
  {
    label: 'Report', icon: BarChart3, children: [
      { to: '/admin/reports/revenue', label: 'Revenue' },
      { to: '/admin/reports/utilization', label: 'Vehicle Utilization' },
    ],
  },
  {
    label: 'Settings', icon: Settings, children: [
      { to: '/admin/settings', label: 'Profile' },
      { to: '/admin/settings?page=password', label: 'Password' },
      { to: '/admin/settings?page=business', label: 'Business' },
      { to: '/admin/settings?page=team', label: 'Team' },
      { to: '/admin/settings?page=payments', label: 'Payments' },
      { to: '/admin/settings?page=documents', label: 'Customer Documents' },
      { to: '/admin/settings?page=integrations', label: 'Integrations' },
      { to: '/admin/settings?page=pickup', label: 'Pickup & Drop-off' },
      { to: '/admin/settings?page=email-log', label: 'Email Log' },
      { to: '/admin/settings?page=content', label: 'Content' },
      { to: '/admin/settings?page=domain', label: 'Domain' },
      { to: '/admin/settings?page=email', label: 'Email' },
      { to: '/admin/settings?page=help', label: 'Help & Guides' },
    ],
  },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const name = user?.user_metadata?.full_name || user?.email || 'Admin'

  return (
    <div className="min-h-screen flex bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#071f52]/10 md:hidden">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Katada" className="h-8 w-8 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
          <span className="text-sm font-extrabold text-[#071f52]">Katada Van Rentals</span>
        </a>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-[#071f52]/64 hover:bg-[#071f52]/8 hover:text-[#071f52] transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 h-screen w-64 shrink-0 border-r border-[#071f52]/10 bg-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-5 pt-6 pb-4 md:block hidden">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Katada" className="h-9 w-9 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
            <span className="text-sm font-extrabold text-[#071f52]">Katada Van Rentals</span>
          </a>
        </div>

        <div className="px-5 pt-6 pb-4 md:hidden">
          <div className="h-8" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {navGroups.map((group) =>
            'to' in group ? (
              <NavLink
                key={group.to}
                to={group.to!}
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
            ) : (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#071f52]/64 transition-colors hover:bg-[#071f52]/8 hover:text-[#071f52]"
                >
                  <group.icon size={18} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown size={14} className={`transition-transform ${openGroups[group.label] ? 'rotate-180' : ''}`} />
                </button>
                {openGroups[group.label] && (
                  <div className="ml-9 mt-0.5 space-y-0.5 border-l border-[#071f52]/10 pl-3">
                    {group.children!.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-[#071f52] bg-[#071f52]/8'
                              : 'text-[#071f52]/48 hover:text-[#071f52] hover:bg-[#071f52]/6'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>

        <div className="border-t border-[#071f52]/10 px-3 py-4 space-y-3">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071f52] text-xs font-black text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#071f52]">{name}</p>
              <p className="truncate text-xs font-medium text-[#071f52]/48">Admin</p>
            </div>
            <button onClick={handleSignOut} className="rounded-lg p-1.5 text-[#071f52]/40 hover:text-[#e92935] transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-16 md:pt-0 md:pl-64">
        <Outlet />
      </main>
    </div>
  )
}
