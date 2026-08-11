import { describe, expect, it } from 'vitest'
import { renderContactMessageEmail } from '../../supabase/functions/_shared/contact-message-email'

describe('contact message email', () => {
  it('uses the shared sharp branded layout', () => {
    const email = renderContactMessageEmail({
      subject: 'Feature request',
      message: 'Please add weekend availability.',
      senderEmail: 'admin@example.com',
      logoUrl: 'https://katadavanrentals.com/logo.jpg',
    })

    expect(email.subject).toBe('[Admin] Feature request')
    expect(email.text).toContain('Please add weekend availability.')
    expect(email.html).toContain('https://katadavanrentals.com/logo.jpg')
    expect(email.html).not.toContain('border-radius')
  })
})
