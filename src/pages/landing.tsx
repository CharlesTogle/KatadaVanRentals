import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/useAuth'
import { CustomerHeader } from '@/components/customer-header'
import { LandingNavbar } from '@/components/landing/landing-navbar'
import { HeroSection } from '@/components/landing/hero-section'
import { FleetSection } from '@/components/landing/fleet-section'
import { ServicesSection } from '@/components/landing/services-section'
import { WhySection } from '@/components/landing/why-section'
import { CTASection } from '@/components/landing/cta-section'
import { FAQSection } from '@/components/landing/faq-section'
import { LandingFooter } from '@/components/landing/landing-footer'
import { FadeSection } from '@/components/landing/fade-section'
import { navLinks } from '@/data/landing'

export default function Landing() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const rightSlot = (
    <>
      <a href="/login" className="text-sm font-bold text-[#071f52]/70 transition-colors hover:text-[#071f52]">
        Sign in
      </a>
      <Button className="bg-[#e92935] text-white shadow-[0_14px_30px_rgba(233,41,53,0.22)] hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" asChild>
        <a href="/register">Book now</a>
      </Button>
    </>
  )

  const mobileFooter = (
    <>
      <a href="/login" className="block py-3 text-sm font-bold text-[#071f52]" onClick={() => setMobileOpen(false)}>
        Sign in
      </a>
      <Button className="mt-2 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" asChild>
        <a href="/register" onClick={() => setMobileOpen(false)}>Book now</a>
      </Button>
    </>
  )

  const logo = (
    <a href="/" className="flex min-w-0 items-center gap-3">
      <img src="/logo.jpg" alt="Katada Transportation Services" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
      <span className="max-w-[165px] text-sm font-extrabold leading-tight tracking-[-0.02em] text-[#071f52] sm:max-w-none sm:text-base">
        Katada Transportation
      </span>
    </a>
  )

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff] text-[#071f52]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user ? (
        <CustomerHeader />
      ) : (
        <LandingNavbar
          logo={logo}
          navLinks={navLinks}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          rightSlot={rightSlot}
          mobileFooter={mobileFooter}
        />
      )}

      <main>
        <HeroSection />

        <FadeSection>
          <FleetSection />
        </FadeSection>

        <FadeSection>
          <ServicesSection />
        </FadeSection>

        <FadeSection>
          <WhySection />
        </FadeSection>

        <FadeSection>
          <CTASection />
        </FadeSection>
      </main>

      <FadeSection>
        <FAQSection />
      </FadeSection>

      <LandingFooter />
    </div>
  )
}
