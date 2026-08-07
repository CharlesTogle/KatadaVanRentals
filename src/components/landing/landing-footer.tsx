import { publicHeaderLinks } from '@/config/navigation'
import { useAppSettings } from '@/hooks/use-app-settings'

export function LandingFooter() {
  const { data: settings } = useAppSettings()
  return (
    <footer className="border-t border-[#071f52]/10 bg-[#f7f9ff] text-[#071f52]">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-8 px-4 py-10 text-sm font-semibold sm:px-6 md:flex-row md:items-end md:justify-between md:gap-6 md:py-8">
        <div className="space-y-3 text-center md:text-left">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
            <span>{settings?.business_name || 'Katada Transportation Services'}</span>
          </div>
          <p className="max-w-[28rem] text-sm font-medium leading-6 text-[#071f52]/58">
            Clean vans, careful drivers, and a simpler booking flow for airport transfers, family trips, and group travel.
          </p>
        </div>

        <div className="space-y-3 text-[#071f52]/66 md:text-right">
          <div className="flex flex-wrap justify-center gap-5 md:justify-end">
            {publicHeaderLinks.map((link) => (
              <a key={link.label} href={link.to} className="transition-colors hover:text-[#e92935]">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-5 text-sm md:justify-end">
            <a href="/terms" className="transition-colors hover:text-[#e92935]">Terms</a>
            <a href="/privacy" className="transition-colors hover:text-[#e92935]">Privacy</a>
            <a href="/login" className="transition-colors hover:text-[#e92935]">Sign in</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
