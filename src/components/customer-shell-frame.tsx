import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, BookCopy, FileText, UserRound, LogOut, Menu, X } from 'lucide-react'
import { customerAccountLinks } from '@/config/navigation'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

function sidebarLinkClasses(isActive: boolean) {
  return cn(
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors',
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
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <div className="sticky top-4 z-20 mb-4 flex items-center justify-between rounded-[24px] border border-[#071f52]/10 bg-white/92 px-4 py-3 shadow-[0_12px_32px_rgba(7,31,82,0.08)] backdrop-blur-md lg:hidden">
          <p className="text-sm font-black text-[#071f52]">Account menu</p>

          <button
            type="button"
            aria-label="Toggle account menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
            className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`fixed bottom-0 right-0 top-0 z-40 w-[min(320px,100vw)] transition-transform duration-300 lg:static lg:w-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_18px_48px_rgba(7,31,82,0.08)] lg:sticky lg:top-8 lg:h-auto">
            <div className="flex items-center justify-between border-b border-[#071f52]/10 px-5 py-4 lg:hidden">
              <p className="text-sm font-black text-[#071f52]">Account menu</p>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-4 border-b border-[#071f52]/10 px-5 py-5">
              {profile?.profile_image_path ? (
                <img src={profile.profile_image_path} alt={name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#071f52] text-lg font-black text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black tracking-[-0.03em] text-[#071f52]">{name}</p>
                <p className="truncate text-sm font-medium text-[#071f52]/48">{user?.email}</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
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
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                )
              })}

              <div className="mt-3 border-t border-[#071f52]/10 pt-3">
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

              <div className="mt-3 border-t border-[#071f52]/10 pt-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-[#e92935] transition-colors hover:bg-[#fff5f5]"
                >
                  <LogOut size={18} />
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
