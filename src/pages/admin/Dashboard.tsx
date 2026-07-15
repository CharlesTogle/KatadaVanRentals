export default function Dashboard() {
  return (
    <div className="px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Bookings', value: '0' },
          { label: 'Active Rentals', value: '0' },
          { label: 'Fleet Size', value: '0' },
          { label: 'Revenue (MTD)', value: '₱0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
