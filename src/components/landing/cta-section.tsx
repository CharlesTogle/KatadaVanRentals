import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="px-4 pb-20 sm:px-6 md:pb-28">
      <div className="mx-auto grid max-w-[1180px] overflow-hidden rounded-[34px] bg-[#e92935] text-white shadow-[0_26px_70px_rgba(233,41,53,0.25)] lg:grid-cols-[1fr_0.8fr]">
        <div className="p-8 sm:p-10 lg:p-12">
          <h2 className="max-w-[620px] text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
            Lock in the van before your travel day gets busy.
          </h2>
          <p className="mt-4 max-w-[520px] text-base font-medium leading-7 text-white/76">
            Create an account, choose your van, and send the booking request in a few minutes.
          </p>
          <Button size="xl" className="mt-8 bg-[#ffd923] text-[#071f52] shadow-none hover:bg-white focus-visible:ring-white" asChild>
            <a href="/register">Book now</a>
          </Button>
        </div>
        <img src="/van-1.jpg" alt="Katada van interior seating" className="h-full min-h-[300px] w-full object-cover lg:min-h-full" />
      </div>
    </section>
  )
}
