export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-gray-900">Katada Van Rentals</span>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign In
            </a>
            <a
              href="/register"
              className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Book Now
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Your Ride, Your Way
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Reliable van rentals for trips, events, and everything in between.
            Book in minutes.
          </p>
          <a
            href="/register"
            className="mt-8 inline-block rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse Our Fleet
          </a>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Katada Van Rentals
      </footer>
    </div>
  )
}
