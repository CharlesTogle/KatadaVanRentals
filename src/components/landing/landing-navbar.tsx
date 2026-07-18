import { Menu, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface LandingNavbarProps {
  logo: ReactNode
  navLinks: { label: string; href: string }[]
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  rightSlot: ReactNode
  mobileFooter?: ReactNode
}

export function LandingNavbar({ logo, navLinks, mobileOpen, setMobileOpen, rightSlot, mobileFooter }: LandingNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#071f52]/10 bg-[#f7f9ff]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-5 px-4 sm:px-6">
        {logo}

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#e92935]">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {rightSlot}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="rounded-full p-2 text-[#071f52] transition-colors hover:bg-[#071f52]/8 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#071f52]/10 bg-[#f7f9ff] px-4 pb-5 pt-2 md:hidden">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="block border-b border-[#071f52]/10 py-3 text-sm font-bold text-[#071f52]" onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          {mobileFooter}
        </div>
      )}
    </nav>
  )
}
