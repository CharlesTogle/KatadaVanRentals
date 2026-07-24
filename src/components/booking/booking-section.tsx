import { cn } from '@/lib/utils'

export function MapPinIcon({ size = 24, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

export function BookingSection({ title, icon: Icon, children, contentClassName }: { title: string; icon?: IconComponent; children: React.ReactNode; contentClassName?: string }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-2">
        {Icon ? <Icon size={16} className="text-[#071f52]" /> : null}
        <h2 className="text-base font-black tracking-[-0.02em] text-[#071f52]">{title}</h2>
      </div>
      <div className={cn('space-y-3', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
