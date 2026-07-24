import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Documents from '@/pages/documents'

const useCustomerDocuments = vi.fn()
const createSignedUrl = vi.fn()

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
    },
  }),
}))

vi.mock('@/hooks/use-documents', () => ({
  useCustomerDocuments: (...args: unknown[]) => useCustomerDocuments(...args),
  useSaveCustomerDocument: () => ({ mutateAsync: vi.fn() }),
  useDeleteCustomerDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(),
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  },
}))

function renderDocuments() {
  return render(
    <MemoryRouter>
      <Documents />
    </MemoryRouter>,
  )
}

describe('Documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/document.jpg' }, error: null })
  })

  it('shows only the loading skeleton while documents are loading', () => {
    useCustomerDocuments.mockReturnValue({
      data: [],
      isLoading: true,
    })

    const { container } = renderDocuments()

    expect(screen.queryByText("Driver's License")).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows document cards after loading finishes', () => {
    useCustomerDocuments.mockReturnValue({
      data: [],
      isLoading: false,
    })

    renderDocuments()

    expect(screen.getByText("Driver's License")).toBeInTheDocument()
    expect(screen.getByText('Other Valid ID')).toBeInTheDocument()
    expect(screen.getByText('Proof of Billing')).toBeInTheDocument()
  })

  it('creates a signed URL only when viewing a document', async () => {
    useCustomerDocuments.mockReturnValue({
      data: [
        {
          id: 'doc-1',
          customer_id: 'user-1',
          document_type: 'driver_license',
          status: 'submitted',
          file_path: 'user-1/driver_license.jpg',
          original_filename: 'license.jpg',
          mime_type: 'image/jpeg',
        },
      ],
      isLoading: false,
    })

    renderDocuments()

    fireEvent.click(screen.getByRole('button', { name: /view/i }))

    await waitFor(() => {
      expect(createSignedUrl).toHaveBeenCalledWith('user-1/driver_license.jpg', 3600)
    })

    expect(screen.getByAltText("Driver's License")).toHaveAttribute('src', 'https://example.com/document.jpg')
  })

  it('falls back to the legacy document path shape when signing fails', async () => {
    createSignedUrl.mockImplementation(async (path: string) => {
      if (path === 'user-1/driver_license.jpg') {
        return { data: null, error: new Error('not found') }
      }

      if (path === 'customer-documents/user-1/driver_license.jpg') {
        return { data: { signedUrl: 'https://example.com/legacy-document.jpg' }, error: null }
      }

      return { data: null, error: new Error(`unexpected path ${path}`) }
    })

    useCustomerDocuments.mockReturnValue({
      data: [
        {
          id: 'doc-1',
          customer_id: 'user-1',
          document_type: 'driver_license',
          status: 'submitted',
          file_path: 'user-1/driver_license.jpg',
          original_filename: 'license.jpg',
          mime_type: 'image/jpeg',
        },
      ],
      isLoading: false,
    })

    renderDocuments()

    fireEvent.click(screen.getByRole('button', { name: /view/i }))

    await waitFor(() => {
      expect(createSignedUrl).toHaveBeenNthCalledWith(1, 'user-1/driver_license.jpg', 3600)
      expect(createSignedUrl).toHaveBeenNthCalledWith(2, 'customer-documents/user-1/driver_license.jpg', 3600)
    })

    expect(screen.getByAltText("Driver's License")).toHaveAttribute('src', 'https://example.com/legacy-document.jpg')
  })
})
