export default function Fleet() {
  return (
    <div className="px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Our Fleet</h1>
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Add Vehicle
        </button>
      </div>
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
        No vehicles listed yet.
      </div>
    </div>
  )
}
