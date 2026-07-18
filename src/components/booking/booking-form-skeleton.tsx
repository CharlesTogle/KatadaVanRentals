export function BookingFormSkeleton() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
      <div className="mb-6 h-4 w-16 rounded-lg bg-[#071f52]/10" />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-[#071f52]/6" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[#071f52]/6" />
      </div>
    </div>
  )
}
