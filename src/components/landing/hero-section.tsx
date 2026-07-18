import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(255,217,35,0.38),transparent_32%),radial-gradient(circle_at_10%_30%,rgba(233,41,53,0.16),transparent_28%)]" />
      <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1180px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
        <div className="max-w-[620px]">
          <div className="mb-5 inline-flex rounded-full border border-[#071f52]/10 bg-white px-4 py-2 text-sm font-bold text-[#071f52] shadow-[0_12px_34px_rgba(7,31,82,0.08)]">
            Pasay City transportation service
          </div>
          <h1 className="text-[2.9rem] font-black leading-[0.98] tracking-[-0.055em] text-[#071f52] sm:text-[4rem] lg:text-[5.35rem]">
            Vans that keep the whole trip calm.
          </h1>
          <p className="mt-5 max-w-[500px] text-lg font-medium leading-8 text-[#071f52]/70">
            Clean vans, careful drivers, clear booking for airport transfers, family trips, and group travel.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="xl" className="bg-[#e92935] text-white shadow-[0_18px_36px_rgba(233,41,53,0.24)] hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" asChild>
              <a href="/register">Book now</a>
            </Button>
            <Button size="xl" variant="outline" className="border-[#071f52]/15 bg-white text-[#071f52] hover:bg-[#ffd923] hover:text-[#071f52]" asChild>
              <a href="#fleet">View fleet</a>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[610px] lg:ml-auto">
          <div className="absolute -left-5 top-8 h-28 w-28 rounded-[28px] bg-[#ffd923] sm:-left-8" />
          <div className="absolute -right-2 bottom-10 h-36 w-36 rounded-[32px] bg-[#e92935] sm:-right-7" />
          <div className="relative overflow-hidden rounded-[30px] border-[10px] border-white bg-white shadow-[0_30px_80px_rgba(7,31,82,0.22)]">
            <img src="/vehicle-sample.jpg" alt="Premium Katada van interior with reclining seats" className="aspect-[4/3] h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-5 right-5 grid grid-cols-3 gap-2 rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_18px_40px_rgba(7,31,82,0.18)] backdrop-blur sm:left-10 sm:right-auto sm:w-[420px]">
            {[
              { value: '24/7', label: 'trip support' },
              { value: '10-14', label: 'seat options' },
              { value: 'Pasay', label: 'home base' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-[#f7f9ff] px-3 py-3 text-center">
                <p className="text-xl font-black tracking-[-0.03em] text-[#071f52]">{item.value}</p>
                <p className="text-[11px] font-bold text-[#071f52]/58">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
