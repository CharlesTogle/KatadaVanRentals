import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, BookCopy, FileText, UserRound, LogOut, Menu, X } from 'lucide-react'
import { customerAccountLinks } from '@/config/navigation'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { useAppSettings } from '@/hooks/use-app-settings'
import { cn } from '@/lib/utils'

function sidebarLinkClasses(isActive: boolean) {
  return cn(
    'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base',
    isActive
      ? 'bg-[#eef2fb] text-[#071f52]'
      : 'text-[#071f52]/72 hover:bg-[#f7f9ff] hover:text-[#071f52]',
  )
}

const navIcons = {
  '/dashboard': Home,
  '/bookings': BookCopy,
  '/documents': FileText,
  '/profile': UserRound,
} as const

export function CustomerShellFrame({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: settings } = useAppSettings()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const name = profile?.first_name || profile?.last_name
    ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    : user?.user_metadata?.full_name || user?.email || 'Customer'

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="customer-shell min-h-screen bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 sm:py-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-6">
        <div className="sticky top-4 z-20 mb-3 flex items-center justify-between rounded-xl border border-[#071f52]/10 bg-white/92 px-3 py-2.5 shadow-[0_8px_24px_rgba(7,31,82,0.06)] backdrop-blur-md lg:hidden">
          <button
            type="button"
            aria-label="Toggle account menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
            className="rounded-full p-1.5 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-8 w-8 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
            <p className="text-xs font-black text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</p>
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`fixed bottom-0 left-0 top-0 z-40 w-[min(300px,100vw)] transition-transform duration-300 lg:static lg:w-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#071f52]/10 bg-white shadow-[0_12px_36px_rgba(7,31,82,0.06)] lg:sticky lg:top-8 lg:h-auto">
            <div className="flex items-center justify-between border-b border-[#071f52]/10 px-4 py-3 lg:hidden">
              <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-8 w-8 rounded-xl object-cover ring-1 ring-[#071f52]/10" />
              <p className="text-xs font-black text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</p>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full p-1.5 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-[#071f52]/10 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
              {profile?.profile_image_path ? (
                <img src={profile.profile_image_path} alt={name} className="h-11 w-11 rounded-full object-cover sm:h-14 sm:w-14" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#071f52] text-base font-black text-white sm:h-14 sm:w-14 sm:text-lg">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black tracking-[-0.02em] text-[#071f52] sm:text-lg sm:tracking-[-0.03em]">{name}</p>
                <p className="truncate text-xs font-medium text-[#071f52]/48 sm:text-sm">{user?.email}</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2.5">
              {customerAccountLinks.map((item) => {
                const Icon = navIcons[item.to as keyof typeof navIcons]

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => sidebarLinkClasses(isActive)}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                )
              })}

              <div className="mt-2 border-t border-[#071f52]/10 pt-2">
                <NavLink
                  to="/"
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => sidebarLinkClasses(isActive)}
                >
                  <Home size={16} />
                  Home
                </NavLink>
                <NavLink
                  to="/our-fleet"
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => sidebarLinkClasses(isActive)}
                >
                  Our Fleet
                </NavLink>
                <NavLink
                  to="/contact"
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => sidebarLinkClasses(isActive)}
                >
                  Contact
                </NavLink>
                <NavLink
                  to="/terms"
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => sidebarLinkClasses(isActive)}
                >
                  Terms
                </NavLink>
                <NavLink
                  to="/privacy"
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => sidebarLinkClasses(isActive)}
                >
                  Privacy
                </NavLink>
              </div>

              <div className="mt-2 border-t border-[#071f52]/10 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#e92935] transition-colors hover:bg-[#fff5f5] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 pt-2 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
