import type { TollPlazaOption, TollRfidBreakdownItem } from '@/types/location'

interface TollPlazaConfirmationProps {
  entryCandidates: TollPlazaOption[]
  exitCandidates: TollPlazaOption[]
  selectedEntry: TollPlazaOption | null
  selectedExit: TollPlazaOption | null
  loading?: boolean
  error?: string
  tollEstimateAmount?: number
  rfidBreakdown?: TollRfidBreakdownItem[]
  onEntrySelect: (candidate: TollPlazaOption) => void
  onExitSelect: (candidate: TollPlazaOption) => void
}

function CandidateButton({
  candidate,
  selected,
  onClick,
}: {
  candidate: TollPlazaOption
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-[#071f52] bg-[#071f52] text-white'
          : 'border-[#071f52]/12 bg-white text-[#071f52] hover:bg-[#f7f9ff]',
      ].join(' ')}
    >
      <p className="text-sm font-bold">{candidate.label}</p>
      <p className={selected ? 'mt-1 text-xs text-white/72' : 'mt-1 text-xs text-[#071f52]/48'}>{candidate.distanceKm.toFixed(2)} km away</p>
    </button>
  )
}

export function TollPlazaConfirmation({
  entryCandidates,
  exitCandidates,
  selectedEntry,
  selectedExit,
  loading = false,
  error,
  tollEstimateAmount = 0,
  rfidBreakdown = [],
  onEntrySelect,
  onExitSelect,
}: TollPlazaConfirmationProps) {
  if (entryCandidates.length === 0 || exitCandidates.length === 0) return null

  return (
    <div className="rounded-[24px] border border-[#071f52]/10 bg-[#f7f9ff] p-4 sm:p-5">
      <div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#071f52]">Toll Estimate</p>
          <p className="mt-1 text-sm font-medium leading-6 text-[#071f52]/56">Confirm the nearest entry and exit plazas so we can price the expressway leg.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#071f52]/56">Entry plaza</p>
          <div className="grid gap-2">
            {entryCandidates.map((candidate) => (
              <CandidateButton
                key={candidate.id}
                candidate={candidate}
                selected={selectedEntry?.id === candidate.id}
                onClick={() => onEntrySelect(candidate)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#071f52]/56">Exit plaza</p>
          <div className="grid gap-2">
            {exitCandidates.map((candidate) => (
              <CandidateButton
                key={candidate.id}
                candidate={candidate}
                selected={selectedExit?.id === candidate.id}
                onClick={() => onExitSelect(candidate)}
              />
            ))}
          </div>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-[#071f52]/48">Computing toll estimate...</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-[#e92935]">{error}</p> : null}
      {!loading && !error && selectedEntry && selectedExit ? (
        <div className="mt-4 rounded-2xl border border-[#071f52]/10 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#071f52]">{selectedEntry.label} to {selectedExit.label}</p>
              <p className="mt-1 text-xs font-medium text-[#071f52]/48">Estimate only. Final actuals are reconciled after the trip.</p>
            </div>
            <p className="text-base font-black text-[#071f52]">₱{Number(tollEstimateAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          {rfidBreakdown.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#071f52]/56">
              {rfidBreakdown.map((item) => (
                <span key={`${item.system}-${item.amount}`} className="rounded-full bg-[#f7f9ff] px-2.5 py-1">
                  {item.system}: ₱{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
