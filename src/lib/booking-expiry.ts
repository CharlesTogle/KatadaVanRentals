export function getBookingExpiryDeadline(startAt: string, expiryHours: number) {
  return new Date(new Date(startAt).getTime() - expiryHours * 60 * 60 * 1000)
}

export function getBookingExpiryMessage(status: string, deadline: Date) {
  if (status !== 'for_review' && status !== 'awaiting_documents') return null

  const date = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(deadline)

  return status === 'for_review'
    ? `If the booking is not confirmed by ${date}, it will be canceled.`
    : `If the required documents are not uploaded by ${date}, the booking will be canceled.`
}
