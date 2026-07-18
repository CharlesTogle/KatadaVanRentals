import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/useAuth'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'react-router-dom'
import {
  SettingsProfileForm,
  SettingsPasswordForm,
  SettingsBusinessForm,
  SettingsContactForm,
} from '@/components/admin/settings-forms'

const tabs = [
  'Profile', 'Password', 'Business',
  'Team', 'Payments', 'Documents', 'Integrations',
  'Pickup', 'Email Log', 'Content', 'Domain', 'Email', 'Help',
  'Contact Developer',
]

export default function AdminSettings({ tab: initialTab }: { tab?: string }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page')
  const [activeTab, setActiveTab] = useState(
    page ? tabs.find(t => t.toLowerCase() === page) ?? initialTab ?? 'Profile' : initialTab || 'Profile',
  )

  const goToTab = (t: string) => {
    setActiveTab(t)
    setSearchParams({ page: t.toLowerCase() }, { replace: true })
  }

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg)
    setMessageType(type)
  }

  const { isLoading } = useQuery({
    queryKey: ['admin', 'settings', user?.id],
    queryFn: async () => undefined,
    enabled: !!user,
  })

  return (
    <div className="p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Settings</h1>

      {message && (
        <div className={cn(
          'mt-4 rounded-xl border px-4 py-2.5 text-sm font-bold',
          messageType === 'success' ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]' : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
        )}>{message}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => goToTab(t)}
              className={cn(
                'block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-colors',
                activeTab === t
                  ? 'bg-[#071f52] text-white'
                  : 'text-[#071f52]/64 hover:bg-[#071f52]/8 hover:text-[#071f52]',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#071f52]/10 bg-white p-6 shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-[#071f52]/6" />)}
            </div>
          ) : (
            <>
              {activeTab === 'Profile' && user && (
                <SettingsProfileForm user={user} saving={saving} setSaving={setSaving} showMessage={showMessage} />
              )}
              {activeTab === 'Password' && (
                <SettingsPasswordForm saving={saving} setSaving={setSaving} showMessage={showMessage} />
              )}
              {activeTab === 'Business' && (
                <SettingsBusinessForm saving={saving} setSaving={setSaving} showMessage={showMessage} />
              )}
              {activeTab === 'Contact Developer' && user && (
                <SettingsContactForm user={user} saving={saving} setSaving={setSaving} showMessage={showMessage} />
              )}
              {!['Profile', 'Password', 'Business', 'Contact Developer'].includes(activeTab) && (
                <div className="text-center py-12">
                  <p className="text-sm font-semibold text-[#071f52]/48">{activeTab} settings coming soon.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
