import { publicHeaderLinks } from '@/config/navigation'
import { useAppSettings } from '@/hooks/use-app-settings'

export function LandingFooter() {
  const { data: settings } = useAppSettings()
  const primaryLinks = publicHeaderLinks.filter((link) => !['/terms', '/privacy'].includes(link.to))

  return (
    <footer className="border-t border-[#071f52]/10 bg-[#f7f9ff] text-[#071f52]">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-12 text-sm font-semibold sm:px-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-16 md:py-14">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
            <span>{settings?.business_name || 'Katada Transportation Services'}</span>
          </div>
          <p className="max-w-[28rem] text-sm font-medium leading-6 text-[#071f52]/58">
            Clean vans, careful drivers, and a simpler booking flow for airport transfers, family trips, and group travel.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="min-w-0 space-y-4 text-[#071f52]/66">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
            {primaryLinks.map((link) => (
              <a key={link.label} href={link.to} className="min-w-0 break-words transition-colors hover:text-[#e92935]">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#071f52]/10 pt-4 text-sm">
            <a href="/terms" className="transition-colors hover:text-[#e92935]">Terms</a>
            <a href="/privacy" className="transition-colors hover:text-[#e92935]">Privacy</a>
            <a href="/login" className="transition-colors hover:text-[#e92935]">Sign in</a>
          </div>
        </nav>
      </div>
    </footer>
  )
}
