import { useEffect, useRef, useState } from 'react'
import { useAdminCustomerSearch } from '@/hooks/use-admin-booking'
import { Dialog } from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import type { AdminCustomerOption } from '@/types/admin-booking'

interface CustomerSearchDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (customer: AdminCustomerOption) => void
}

export function CustomerSearchDialog({ open, onClose, onSelect }: CustomerSearchDialogProps) {
  const [query, setQuery] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdminCustomerSearch(query)
  const items = data?.pages.flatMap((page) => page.items) ?? []

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !sentinelRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) fetchNextPage()
    })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <Dialog open={open} onClose={onClose} title="Select customer">
      <div className="relative mb-4">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#071f52]/38" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          autoFocus
          className="w-full rounded-xl border border-[#071f52]/14 bg-white py-2 pl-9 pr-4 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
        />
      </div>

      <div className="max-h-80 divide-y divide-[#071f52]/6 overflow-y-auto">
        {items.length === 0 && !isFetchingNextPage && (
          <p className="py-6 text-center text-sm font-semibold text-[#071f52]/48">No customers found.</p>
        )}
        {items.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => { onSelect(customer); onClose() }}
            className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-[#f7f9ff]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#071f52]/8 text-xs font-bold text-[#071f52]">
              {customer.first_name?.[0] ?? customer.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#071f52]">
                {customer.first_name} {customer.last_name}
              </p>
              <p className="truncate text-xs text-[#071f52]/48">{customer.email}</p>
            </div>
          </button>
        ))}
        {isFetchingNextPage && (
          <p className="py-3 text-center text-xs font-semibold text-[#071f52]/38">Loading more...</p>
        )}
        <div ref={sentinelRef} />
      </div>
    </Dialog>
  )
}
