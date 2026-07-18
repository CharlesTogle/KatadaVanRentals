import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { MapPin, ArrowLeft } from 'lucide-react'

const countries = [
  'Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom',
  'Singapore', 'Japan', 'South Korea', 'Hong Kong', 'Other',
]

export default function RegistrationAddress() {
  const [address, setAddress] = useState({ address: '', city: '', province: '', zip: '', country: 'Philippines' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        address: address.address,
        city: address.city,
        province: address.province,
        zip_code: address.zip,
        country: address.country,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    navigate('/registration/documents')
  }

  const handleSkip = () => navigate('/registration/documents')

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9ff] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-[480px]">
        <a href="/" className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back home
        </a>

        <div className="rounded-[28px] border border-[#071f52]/10 bg-white p-8 shadow-[0_20px_60px_rgba(7,31,82,0.14)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
            <MapPin size={15} />
            Step 1 of 2
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Your address</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-[#071f52]/58">
            We will use this to pre-fill your booking forms.
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-[#e92935]/30 bg-[#e92935]/8 px-4 py-3 text-sm font-bold text-[#b91c1c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#071f52]">Complete Address <span className="text-[#e92935]">*</span></label>
              <input required value={address.address}
                onChange={(e) => setAddress({ ...address, address: e.target.value })}
                placeholder="House / Street / Barangay"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#071f52]">City <span className="text-[#e92935]">*</span></label>
                <input required value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="Pasay City"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#071f52]">Province <span className="text-[#e92935]">*</span></label>
                <input required value={address.province}
                  onChange={(e) => setAddress({ ...address, province: e.target.value })}
                  placeholder="Metro Manila"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#071f52]">ZIP Code <span className="text-[#e92935]">*</span></label>
                <input required value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                  placeholder="1309"
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#071f52]">Country <span className="text-[#e92935]">*</span></label>
                <select value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
                >
                  {countries.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1 bg-[#071f52] text-white hover:bg-[#112458]" size="lg">
                {loading ? 'Saving...' : 'Continue'}
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip} className="flex-1" size="lg">
                Skip for now
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
