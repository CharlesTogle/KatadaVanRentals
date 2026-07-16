import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Bell, LogOut, Menu, X } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/bookings', label: 'My Bookings' },
  { to: '/profile', label: 'Profile' },
]

export default function CustomerLayout() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const name = user?.user_metadata?.full_name || user?.email || 'Customer'

  return (
    <div className="min-h-screen bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-[#071f52]/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Katada" className="h-9 w-9 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
            <span className="text-sm font-extrabold text-[#071f52]">Katada Transportation</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/our-fleet" className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#e92935]">
              Our Fleet
            </Link>
            <Link to="/contact" className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#e92935]">
              Contact
            </Link>
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm font-bold transition-colors ${
                    isActive ? 'text-[#071f52]' : 'text-[#071f52]/70 hover:text-[#e92935]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/dashboard/notifications" className="relative rounded-full p-2 text-[#071f52]/58 transition-colors hover:bg-[#071f52]/8 hover:text-[#071f52]">
              <Bell size={20} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e92935] text-[9px] font-black text-white">0</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                className="flex items-center gap-2 rounded-full border border-[#071f52]/10 bg-[#f7f9ff] px-3 py-1.5 text-sm font-bold text-[#071f52] transition-colors hover:bg-[#071f52]/8"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#071f52] text-xs font-black text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{name}</span>
              </button>

              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-[240px] overflow-hidden rounded-2xl border border-[#071f52]/10 bg-white shadow-[0_16px_48px_rgba(7,31,82,0.18)]">
                    <div className="border-b border-[#071f52]/10 px-4 py-3">
                      <p className="text-sm font-bold text-[#071f52]">{name}</p>
                      <p className="text-xs font-medium text-[#071f52]/48">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      {links.map(({ to, label, end }) => (
                        <NavLink
                          key={to} to={to} end={end}
                          onClick={() => setAvatarOpen(false)}
                          className={({ isActive }) =>
                            `block rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                              isActive ? 'bg-[#f7f9ff] text-[#071f52]' : 'text-[#071f52]/70 hover:bg-[#f7f9ff] hover:text-[#071f52]'
                            }`
                          }
                        >
                          {label}
                        </NavLink>
                      ))}
                      <hr className="my-1 border-[#071f52]/10" />
                      <button onClick={signOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#e92935] transition-colors hover:bg-[#e92935]/8"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-[#071f52]/10 bg-white px-4 pb-4 pt-2 md:hidden">
            {[
              { to: '/our-fleet', label: 'Our Fleet' },
              { to: '/contact', label: 'Contact' },
              ...links,
            ].map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                className="block border-b border-[#071f52]/10 py-3 text-sm font-bold text-[#071f52]/70 last:border-0"
              >
                {label}
              </Link>
            ))}
            <button onClick={signOut}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#e92935]"
            >
              <LogOut size={16} /> Logout
            </button>
          </nav>
        )}
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
