import { faqs } from '@/data/landing'
import { FaqItem } from '@/components/landing/faq-item'

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6 md:pb-24">
      <h2 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">
        Frequently asked questions
      </h2>
      <p className="mt-3 text-base font-medium leading-7 text-[#071f52]/68">
        Quick answers about our rentals, pricing, and booking process.
      </p>
      <div className="mt-8 space-y-3">
        {faqs.map((faq, i) => (
          <FaqItem key={i} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </section>
  )
}
