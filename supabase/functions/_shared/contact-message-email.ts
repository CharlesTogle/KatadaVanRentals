import { escapeHtml, renderEmailLayout } from './email-layout.ts'

export interface ContactMessageEmailInput {
  subject: string
  message: string
  senderEmail: string
  logoUrl?: string
}

export function renderContactMessageEmail(input: ContactMessageEmailInput) {
  const subject = input.subject.trim()
  const message = input.message.trim()
  const text = `From: ${input.senderEmail}\n\n${message}`
  const html = renderEmailLayout({
    logoUrl: input.logoUrl,
    preheader: subject,
    label: 'Admin message',
    title: escapeHtml(subject),
    intro: `Message from ${escapeHtml(input.senderEmail)}.`,
    content: `<div style="border-top:2px solid #071f52; padding-top:18px; color:#52627d; font-size:14px; line-height:1.7; white-space:pre-wrap;">${escapeHtml(message)}</div>`,
    footer: 'This message was sent from the Katada Van Rentals admin settings.',
  })

  return { subject: `[Admin] ${subject}`, text, html }
}
