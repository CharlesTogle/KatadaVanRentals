import { AppHeader } from '@/components/app-header'
import { HeroSection } from '@/components/landing/hero-section'
import { FleetSection } from '@/components/landing/fleet-section'
import { ServicesSection } from '@/components/landing/services-section'
import { WhySection } from '@/components/landing/why-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { CTASection } from '@/components/landing/cta-section'
import { FAQSection } from '@/components/landing/faq-section'
import { ContactSection } from '@/components/landing/contact-section'
import { LandingFooter } from '@/components/landing/landing-footer'
import { FadeSection } from '@/components/landing/fade-section'

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff] text-[#071f52]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AppHeader />

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
          <TestimonialsSection />
        </FadeSection>

        <FadeSection>
          <CTASection />
        </FadeSection>
      </main>

      <FadeSection>
        <FAQSection />
      </FadeSection>

      <FadeSection>
        <ContactSection />
      </FadeSection>

      <LandingFooter />
    </div>
  )
}
