import { useState } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { CustomerHeader } from '@/components/CustomerHeader'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Send } from 'lucide-react'
import { CONTACT_MESSAGES } from '@/constants/contact'

const sources = [
  'Google Search', 'Google Map', 'Facebook', 'Instagram', 'TikTok',
  'Twitter/X', 'LinkedIn', 'YouTube', 'Referral', 'Others',
]

export default function Contact() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', source: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user && <CustomerHeader />}
      <div className={`mx-auto max-w-[1180px] px-4 sm:px-6 ${user ? 'py-6 sm:py-8' : 'py-10 sm:py-14'}`}>
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Contact Us</h1>
          <p className="mt-3 text-base font-medium leading-7 text-[#071f52]/68">
            Send us a message and we will get back to you as soon as possible.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-[#071f52]/10 bg-white p-6 shadow-[0_14px_40px_rgba(7,31,82,0.08)] sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd923]">
                  <Send size={24} className="text-[#071f52]" />
                </div>
                <h2 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">{CONTACT_MESSAGES.success.message_sent}</h2>
                <p className="mt-2 text-sm font-medium text-[#071f52]/58">
                  {CONTACT_MESSAGES.success.thank_you}
                </p>
                <Button onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', email: '', message: '', source: '' }) }} className="mt-6" variant="outline">
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-bold text-[#071f52]">Name <span className="text-[#e92935]">*</span></label>
                    <input id="name" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-bold text-[#071f52]">Phone <span className="text-[#e92935]">*</span></label>
                    <input id="phone" type="tel" required value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+63 912 345 6789"
                      className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-bold text-[#071f52]">Email <span className="text-[#e92935]">*</span></label>
                  <input id="email" type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="source" className="text-sm font-bold text-[#071f52]">How did you find us? <span className="text-[#e92935]">*</span></label>
                  <select id="source" required value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  >
                    <option value="">Select one…</option>
                    {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-bold text-[#071f52]">Message <span className="text-[#e92935]">*</span></label>
                  <textarea id="message" required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={4} placeholder="Tell us about your trip or question…"
                    className="block w-full resize-none rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                  />
                </div>

                <Button type="submit" className="w-full gap-2 bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
                  <Send size={16} /> Send message
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#071f52]/10 bg-white p-6 shadow-[0_10px_30px_rgba(7,31,82,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd923]">
                  <Phone size={20} className="text-[#071f52]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#071f52]/48">PHONE</p>
                  <p className="text-base font-bold text-[#071f52]">+63 906 496 1248</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#071f52]/10 bg-white p-6 shadow-[0_10px_30px_rgba(7,31,82,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd923]">
                  <Mail size={20} className="text-[#071f52]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#071f52]/48">EMAIL</p>
                  <p className="text-base font-bold text-[#071f52]">tadsuu@gmail.com</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#071f52]/10 bg-white p-6 shadow-[0_10px_30px_rgba(7,31,82,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd923]">
                  <MapPin size={20} className="text-[#071f52]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#071f52]/48">ADDRESS</p>
                  <p className="text-base font-bold text-[#071f52]">11th 12th St., Villamor, Pasay City, Metro Manila</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
