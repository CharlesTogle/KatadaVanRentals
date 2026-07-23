import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FleetForm, toVehicleInput } from '@/components/admin/fleet-form'
import { useCreateVehicle } from '@/hooks/use-vehicles'
import { toast } from 'sonner'

export default function FleetNew() {
  const navigate = useNavigate()
  const createMutation = useCreateVehicle()

  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <button
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#071f52]/60 hover:text-[#071f52] transition-colors"
        onClick={() => navigate('/admin/fleet')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Fleet
      </button>

      <h1 className="mb-6 text-2xl font-black tracking-[-0.03em] text-[#071f52]">Add New Vehicle</h1>

      <div className="rounded-2xl p-6">
        <FleetForm
          draftKey="new_vehicle"
          onSubmit={async (data) => {
            await createMutation.mutateAsync(toVehicleInput(data))
            toast.success(`${data.name} added.`)
            navigate('/admin/fleet')
          }}
          onCancel={() => navigate('/admin/fleet')}
          isProcessing={createMutation.isPending}
        />
      </div>
    </div>
  )
}
