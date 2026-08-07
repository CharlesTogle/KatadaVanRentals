import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { customerAccountLinks, publicHeaderLinks, adminHeaderLinks, type HeaderNavItem } from '@/config/navigation'
import { useAuth } from '@/contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'
import { useAppSettings } from '@/hooks/use-app-settings'
import { isAdminRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  onMenuClick?: () => void
  mobileMenuOpen?: boolean
}

function HeaderLink({ item, onClick, active }: { item: HeaderNavItem; onClick?: () => void; active?: boolean }) {
  const isHashLink = item.to.startsWith('/#')

  if (isHashLink) {
    return (
      <a
        href={item.to}
        onClick={onClick}
        className={cn(
          'text-sm font-bold transition-colors',
          active ? 'text-[#071f52]' : 'text-[#071f52]/70 hover:text-[#e92935]',
        )}
      >
        {item.label}
      </a>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'text-sm font-bold transition-colors',
          isActive ? 'text-[#071f52]' : 'text-[#071f52]/70 hover:text-[#e92935]',
        )
      }
    >
      {item.label}
    </NavLink>
  )
}

export function AppHeader({ onMenuClick, mobileMenuOpen = false }: AppHeaderProps) {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: settings } = useAppSettings()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const isAdmin = isAdminRole(profile?.role)
  const variant = isAdmin ? 'admin' : 'public'
  const usesExternalMenu = typeof onMenuClick === 'function'
  const menuOpen = usesExternalMenu ? mobileMenuOpen : mobileOpen

  const name = profile?.first_name || profile?.last_name
    ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    : user?.user_metadata?.full_name || user?.email || 'Customer'

  const avatarSrc = profile?.profile_image_path || user?.user_metadata?.avatar_url || null
  const topLinks = variant === 'admin' ? adminHeaderLinks : publicHeaderLinks
  const accountLinks = variant === 'admin' ? adminHeaderLinks : customerAccountLinks

  const handleSignOut = async () => {
    setAccountOpen(false)
    setMobileOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#071f52]/10 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
          <span className="min-w-0 truncate text-sm font-extrabold leading-tight tracking-[-0.02em] text-[#071f52] sm:text-base">
            {settings?.business_name || 'Katada Van Rentals'}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {topLinks.map((item) => (
            <HeaderLink key={item.label} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user ? (
            <>
              <Link to="/login" className="hidden text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#071f52] md:inline-flex">
                Sign in
              </Link>
              <Link to="/register" className="hidden rounded-full bg-[#e92935] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_30px_rgba(233,41,53,0.22)] transition-colors hover:bg-[#c91f2a] md:inline-flex">
                Book Now
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-[#071f52]/10 bg-[#f7f9ff] px-2.5 py-1.5 text-sm font-bold text-[#071f52] transition-colors hover:bg-[#eef3ff] sm:px-3"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071f52] text-xs font-black text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden max-w-[190px] truncate sm:inline">{name}</span>
              </button>

              {accountOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-[280px] overflow-hidden rounded-[24px] border border-[#071f52]/10 bg-white shadow-[0_20px_48px_rgba(7,31,82,0.18)]">
                    <div className="border-b border-[#071f52]/10 px-5 py-4">
                      <p className="text-lg font-black tracking-[-0.03em] text-[#071f52]">{name}</p>
                      <p className="mt-1 truncate text-sm font-medium text-[#071f52]/48">{user.email}</p>
                    </div>

                    <div className="p-3">
                      {accountLinks.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setAccountOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive ? 'bg-[#eef2fb] text-[#071f52]' : 'text-[#071f52]/72 hover:bg-[#f7f9ff] hover:text-[#071f52]',
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}

                      <hr className="my-2 border-[#071f52]/10" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-[#e92935] transition-colors hover:bg-[#e92935]/8"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label={usesExternalMenu ? 'Toggle navigation panel' : 'Toggle menu'}
            aria-expanded={menuOpen}
            onClick={usesExternalMenu ? onMenuClick : () => setMobileOpen((open) => !open)}
            className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {!usesExternalMenu && mobileOpen && (
        <div className="border-t border-[#071f52]/10 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="space-y-1">
            {topLinks.map((item) => (
              <HeaderLink key={item.label} item={item} onClick={() => setMobileOpen(false)} active />
            ))}
          </div>

          {!user ? (
            <div className="mt-3 space-y-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block rounded-2xl border border-[#071f52]/10 px-4 py-3 text-sm font-bold text-[#071f52]">
                Sign in
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block rounded-2xl bg-[#e92935] px-4 py-3 text-sm font-bold text-white">
                Book Now
              </Link>
            </div>
          ) : (
            <div className="mt-3 rounded-[24px] border border-[#071f52]/10 bg-[#f7f9ff] p-3">
              {accountLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-white text-[#071f52]' : 'text-[#071f52]/72 hover:bg-white hover:text-[#071f52]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-[#e92935]"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
