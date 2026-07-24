export function BookingFormSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 h-4 w-28 rounded-lg bg-[#071f52]/10" />
      <div className="mb-3 h-10 w-72 rounded-xl bg-[#071f52]/10" />
      <div className="mb-8 h-5 w-96 rounded-xl bg-[#071f52]/8" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-[#071f52]/6" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-[#071f52]/6" />
      </div>
    </div>
  )
}
