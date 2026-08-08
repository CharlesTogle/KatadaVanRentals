export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getPhilippineMobileDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('63')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

export function normalizePhilippineMobile(value: string): string {
  return `+63${getPhilippineMobileDigits(value)}`
}

export const passwordRequirements = [
  { label: '8 characters', test: (password: string) => password.length >= 8 },
  { label: '1 uppercase letter', test: (password: string) => /[A-Z]/.test(password) },
  { label: '1 lowercase letter', test: (password: string) => /[a-z]/.test(password) },
  { label: '1 number', test: (password: string) => /\d/.test(password) },
  { label: '1 special character', test: (password: string) => /[^A-Za-z0-9]/.test(password) },
] as const

export function getPasswordRequirementChecks(password: string) {
  return passwordRequirements.map((requirement) => ({
    label: requirement.label,
    satisfied: requirement.test(password),
  }))
}

export function isValidPassword(password: string): boolean {
  return getPasswordRequirementChecks(password).every((requirement) => requirement.satisfied)
}
