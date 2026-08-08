import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarding from '@/pages/onboarding'

const useProfileMock = vi.fn()
const useCustomerDocumentsMock = vi.fn()
const saveDocumentMock = vi.fn()
const navigateMock = vi.fn()
const uploadMock = vi.fn()

const profile = {
  id: 'user-1', role: 'customer', first_name: 'Alex', last_name: 'Customer', email: 'alex@example.com', mobile: '+63 9171234567',
  address_line_1: 'Unit 3A', address_line_2: 'Blue Residences', street_address: 'Taft Avenue', barangay: 'Barangay 76',
  address: 'Unit 3A, Blue Residences, Taft Avenue, Barangay 76', city: 'Pasay City', province: 'Metro Manila', zip_code: '1309', country: 'Philippines',
  profile_image_path: null, is_active: true, last_login_at: null, created_at: '', updated_at: '',
}

const documents = [
  { id: 'doc-1', customer_id: 'user-1', document_type: 'driver_license', status: 'submitted', file_path: 'user-1/driver_license.jpg', original_filename: 'license.jpg' },
  { id: 'doc-2', customer_id: 'user-1', document_type: 'valid_id', status: 'verified', file_path: 'user-1/valid_id.jpg', original_filename: 'valid-id.jpg' },
]

vi.mock('@/contexts/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/hooks/use-profile', () => ({
  useProfile: (...args: unknown[]) => useProfileMock(...args),
  useUpdateProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/use-documents', () => ({
  useCustomerDocuments: (...args: unknown[]) => useCustomerDocumentsMock(...args),
  useSaveCustomerDocument: () => ({ mutateAsync: saveDocumentMock }),
}))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ upload: uploadMock }) } } }))
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn() } }))

function renderOnboarding() {
  return render(<MemoryRouter><Onboarding /></MemoryRouter>)
}

async function advanceToChoice(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProfileMock.mockReturnValue({ data: profile, isLoading: false })
    useCustomerDocumentsMock.mockReturnValue({ data: [], isLoading: false })
    uploadMock.mockResolvedValue({ error: null })
    saveDocumentMock.mockResolvedValue(undefined)
  })

  it('blocks missing required personal details', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.clear(screen.getByLabelText('First Name'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('First Name is required.')).toBeInTheDocument()
    expect(screen.queryByText(/looking to self drive/i)).not.toBeInTheDocument()
  })

  it('keeps the phone number at the +63 prefix and ten local digits', async () => {
    const user = userEvent.setup()
    useProfileMock.mockReturnValue({ data: { ...profile, mobile: '' }, isLoading: false })
    renderOnboarding()
    const phone = screen.getByLabelText('Phone Number')
    await user.clear(phone)
    await user.type(phone, '9171234567890')

    expect(phone).toHaveValue('+639171234567')
  })

  it('does not ask for a mobile number that was already added by admin', () => {
    renderOnboarding()

    expect(screen.queryByLabelText('Phone Number')).not.toBeInTheDocument()
  })

  it('takes the no branch directly to the welcome page', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await advanceToChoice(user)
    await user.click(screen.getByRole('button', { name: /i need a driver/i }))

    expect(screen.getByText('Welcome to Katada Van Rentals!!')).toBeInTheDocument()
  })

  it('requires both documents for the self-drive branch', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await advanceToChoice(user)
    await user.click(screen.getByRole('button', { name: /looking to self drive/i }))

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('uploads a selected driver license to the customer document store', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await advanceToChoice(user)
    await user.click(screen.getByRole('button', { name: /looking to self drive/i }))
    await user.click(screen.getAllByRole('button', { name: /upload/i })[0])
    await user.upload(screen.getByLabelText('Upload document file'), new File(['license'], 'license.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(saveDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ document_type: 'driver_license', file_path: 'user-1/driver_license.jpg' })))
  })

  it('completes the self-drive branch when both documents already exist', async () => {
    const user = userEvent.setup()
    useCustomerDocumentsMock.mockReturnValue({ data: documents, isLoading: false })
    renderOnboarding()
    await advanceToChoice(user)
    await user.click(screen.getByRole('button', { name: /looking to self drive/i }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Welcome to Katada Van Rentals!!')).toBeInTheDocument()
  })

  it('navigates to the dashboard from the welcome page', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await advanceToChoice(user)
    await user.click(screen.getByRole('button', { name: /i need a driver/i }))
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }))

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })
})
