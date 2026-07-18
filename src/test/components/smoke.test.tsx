import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FaqItem } from '@/components/landing/faq-item'
import { BookingSection } from '@/components/booking/booking-section'
import { Info } from 'lucide-react'
import { BookingFormSkeleton } from '@/components/booking/booking-form-skeleton'

describe('FaqItem', () => {
  it('renders question text', () => {
    render(<FaqItem question="Test question?" answer="Test answer." />)
    expect(screen.getByText('Test question?')).toBeDefined()
  })

  it('toggle shows/hides answer', () => {
    render(<FaqItem question="Q?" answer="The answer." />)
    expect(screen.queryByText('The answer.')).toBeNull()
    fireEvent.click(screen.getByText('Q?'))
    expect(screen.getByText('The answer.')).toBeDefined()
  })
})

describe('BookingSection', () => {
  it('renders title and children', () => {
    render(
      <BookingSection title="Test Section" icon={Info}>
        <p>Section content</p>
      </BookingSection>
    )
    expect(screen.getByText('Test Section')).toBeDefined()
    expect(screen.getByText('Section content')).toBeDefined()
  })
})

describe('BookingFormSkeleton', () => {
  it('renders skeleton placeholder blocks', () => {
    const { container } = render(<BookingFormSkeleton />)
    const blocks = container.querySelectorAll('.rounded-2xl')
    expect(blocks.length).toBe(6) // 5 form sections + 1 price summary
  })
})
