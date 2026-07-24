import { useState } from 'react'
import { CustomerSearchDialog } from '@/components/admin/customer-search-dialog'
import { User, Plus } from 'lucide-react'
import type { AdminCustomerOption } from '@/types/admin-booking'

type CustomerMode = 'existing' | 'new'

interface NewCustomerData {
  firstName: string
  lastName: string
  email: string
  mobile: string
  sendInvite: boolean
}

export interface CustomerPickerValue {
  mode: CustomerMode
  existingCustomer: AdminCustomerOption | null
  newCustomer: NewCustomerData
}

interface CustomerPickerProps {
  value: CustomerPickerValue
  onChange: (next: CustomerPickerValue) => void
}

const defaultNewCustomer: NewCustomerData = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  sendInvite: true,
}

const inputClass = 'w-full rounded-xl border border-[#071f52]/14 bg-white py-2 px-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 focus:border-[#071f52] focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60'
const labelClass = 'text-xs font-bold text-[#071f52]/58 mb-1 block'

export function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['existing', 'new'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({
              mode,
              existingCustomer: mode === 'existing' ? value.existingCustomer : null,
              newCustomer: mode === 'new' ? defaultNewCustomer : value.newCustomer,
            })}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              value.mode === mode
                ? 'bg-[#071f52] text-white'
                : 'bg-white text-[#071f52]/58 border border-[#071f52]/10 hover:bg-[#071f52]/8'
            }`}
          >
            {mode === 'existing' ? <User size={12} /> : <Plus size={12} />}
            {mode === 'existing' ? 'Existing customer' : 'New customer'}
          </button>
        ))}
      </div>

      {value.mode === 'existing' ? (
        <div>
          {value.existingCustomer ? (
            <div className="flex items-center justify-between rounded-xl border border-[#071f52]/10 bg-[#f7f9ff] p-3">
              <div>
                <p className="text-sm font-bold text-[#071f52]">
                  {value.existingCustomer.first_name} {value.existingCustomer.last_name}
                </p>
                <p className="text-xs text-[#071f52]/48">{value.existingCustomer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="rounded-full px-3 py-1 text-[11px] font-bold text-[#071f52]/58 hover:text-[#071f52]"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#071f52]/20 bg-white py-4 text-sm font-bold text-[#071f52]/58 transition-colors hover:border-[#071f52]/40 hover:text-[#071f52]"
            >
              <User size={16} />
              Select customer
            </button>
          )}
          <CustomerSearchDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSelect={(customer) => onChange({ ...value, existingCustomer: customer })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First name *</label>
            <input
              value={value.newCustomer.firstName}
              onChange={(e) => onChange({ ...value, newCustomer: { ...value.newCustomer, firstName: e.target.value } })}
              className={inputClass}
              placeholder="First name"
            />
          </div>
          <div>
            <label className={labelClass}>Last name *</label>
            <input
              value={value.newCustomer.lastName}
              onChange={(e) => onChange({ ...value, newCustomer: { ...value.newCustomer, lastName: e.target.value } })}
              className={inputClass}
              placeholder="Last name"
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              value={value.newCustomer.email}
              onChange={(e) => onChange({ ...value, newCustomer: { ...value.newCustomer, email: e.target.value } })}
              className={inputClass}
              placeholder="email@example.com"
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Mobile</label>
            <input
              value={value.newCustomer.mobile}
              onChange={(e) => onChange({ ...value, newCustomer: { ...value.newCustomer, mobile: e.target.value } })}
              className={inputClass}
              placeholder="+63 9xx xxx xxxx"
            />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#071f52]">
              <input
                type="checkbox"
                checked={value.newCustomer.sendInvite}
                onChange={(e) => onChange({ ...value, newCustomer: { ...value.newCustomer, sendInvite: e.target.checked } })}
                className="h-4 w-4 rounded border-[#071f52]/20 text-[#071f52] focus:ring-[#ffd923]"
              />
              Email a "set your password" invite
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
