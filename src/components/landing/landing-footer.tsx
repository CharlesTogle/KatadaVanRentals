export function LandingFooter() {
  return (
    <footer className="border-t border-[#071f52]/10 bg-[#f7f9ff] text-[#071f52]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-8 text-sm font-semibold sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Katada Transportation Services" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
          <span>Katada Transportation Services</span>
        </div>
        <div className="flex flex-wrap gap-5 text-[#071f52]/66">
          <a href="#fleet" className="transition-colors hover:text-[#e92935]">Fleet</a>
          <a href="#services" className="transition-colors hover:text-[#e92935]">Services</a>
          <a href="#why" className="transition-colors hover:text-[#e92935]">Why Katada</a>
          <a href="/login" className="transition-colors hover:text-[#e92935]">Sign in</a>
        </div>
      </div>
    </footer>
  )
}
