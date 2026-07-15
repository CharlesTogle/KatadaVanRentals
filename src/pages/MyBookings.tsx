export default function MyBookings() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
      <p className="mt-2 text-gray-500">Your upcoming and past rentals.</p>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
        No bookings yet. Browse our fleet to get started.
      </div>
    </div>
  )
}
