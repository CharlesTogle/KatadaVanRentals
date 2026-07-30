import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, BookCopy, FileText, UserRound, LogOut } from 'lucide-react'
import { customerAccountLinks } from '@/config/navigation'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

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
        <aside>
          <div className="overflow-hidden rounded-[28px] border border-[#071f52]/10 bg-white shadow-[0_18px_48px_rgba(7,31,82,0.08)] lg:sticky lg:top-8">
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

            <nav className="px-2 py-3">
              {customerAccountLinks.map((item) => {
                const Icon = navIcons[item.to as keyof typeof navIcons]

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-[#eef2fb] text-[#071f52] shadow-[inset_-3px_0_0_0_#1e3a8a]'
                          : 'text-[#071f52]/72 hover:bg-[#f7f9ff] hover:text-[#071f52]',
                      )
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                )
              })}

              <div className="mt-3 border-t border-[#071f52]/10 pt-3">
                <Link
                  to="/our-fleet"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-[#071f52]/72 transition-colors hover:bg-[#f7f9ff] hover:text-[#071f52]"
                >
                  Our Fleet
                </Link>
                <Link
                  to="/contact"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-[#071f52]/72 transition-colors hover:bg-[#f7f9ff] hover:text-[#071f52]"
                >
                  Contact
                </Link>
                <Link
                  to="/terms"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-[#071f52]/72 transition-colors hover:bg-[#f7f9ff] hover:text-[#071f52]"
                >
                  Terms
                </Link>
                <Link
                  to="/privacy"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-[#071f52]/72 transition-colors hover:bg-[#f7f9ff] hover:text-[#071f52]"
                >
                  Privacy
                </Link>
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

        <main className="min-w-0 pt-6 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
