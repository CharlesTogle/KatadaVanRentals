import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Profile from '@/pages/profile'

const mutate = vi.fn()
const useProfileMock = vi.fn()
const mockUser = {
  id: 'user-1',
  email: 'customer@example.com',
  user_metadata: { full_name: 'Alex Customer' },
}

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: (...args: unknown[]) => useProfileMock(...args),
  useUpdateProfile: () => ({ mutate }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
      }),
    },
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

const validProfile = {
  first_name: 'Alex',
  last_name: 'Customer',
  email: 'customer@example.com',
  mobile: '+63 9171234567',
  address_line_1: 'Unit 3A',
  address_line_2: 'Blue Residences',
  street_address: 'Taft Avenue',
  barangay: 'Barangay 76',
  address: '123 Test St',
  city: 'Pasay City',
  province: 'Metro Manila',
  zip_code: '1309',
  country: 'Philippines',
  profile_image_path: null,
}

let mockProfile = validProfile

describe('Profile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mockUser.user_metadata.full_name = 'Alex Customer'
    mockProfile = validProfile
    useProfileMock.mockReturnValue({ data: mockProfile, isLoading: false })
  })

  it('shows inline validation labels for missing names and short mobile numbers', () => {
    mockUser.user_metadata.full_name = ''
    mockProfile = {
      ...validProfile,
      first_name: '',
      last_name: '',
      mobile: '+63 917123456',
    }
    useProfileMock.mockReturnValue({ data: mockProfile, isLoading: false })
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(false)

    render(<Profile />)

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText('First name is required.')).toBeInTheDocument()
    expect(screen.getByText('Last name is required.')).toBeInTheDocument()
    expect(screen.getByText('Mobile number must be exactly 10 digits.')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('keeps the mobile input at exactly 10 digits after the +63 prefix', () => {
    vi.spyOn(HTMLFormElement.prototype, 'reportValidity').mockReturnValue(true)

    render(<Profile />)

    const mobileInput = screen.getByPlaceholderText('+639171234567')

    fireEvent.change(mobileInput, { target: { value: '+63 9171234567890' } })
    expect(mobileInput).toHaveValue('+639171234567')

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user-1',
      data: expect.objectContaining({ mobile: '+639171234567' }),
    }), expect.any(Object))
  })

  it('searches and selects a country from the full list', () => {
    render(<Profile />)

    fireEvent.click(screen.getByRole('button', { name: 'Country' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search countries' }), { target: { value: 'Canada' } })
    fireEvent.click(screen.getByRole('option', { name: 'Canada' }))

    expect(screen.getByRole('button', { name: 'Country' })).toHaveTextContent('Canada')
  })
})
