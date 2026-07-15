import { useAuth } from '../contexts/useAuth'

export default function Profile() {
  const { user, signOut } = useAuth()

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="mt-6 space-y-3">
        <div>
          <span className="text-sm text-gray-500">Name</span>
          <p className="text-gray-900">{user?.user_metadata?.full_name ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Email</span>
          <p className="text-gray-900">{user?.email}</p>
        </div>
      </div>

      <button
        onClick={signOut}
        className="mt-8 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  )
}
