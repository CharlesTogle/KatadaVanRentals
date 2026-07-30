export interface ProfileAddressParts {
  address_line_1: string
  address_line_2: string
  street_address: string
  barangay: string
}

const EMPTY_ADDRESS_PARTS: ProfileAddressParts = {
  address_line_1: '',
  address_line_2: '',
  street_address: '',
  barangay: '',
}

export function composeProfileAddress(parts: ProfileAddressParts): string {
  return [parts.address_line_1, parts.address_line_2, parts.street_address, parts.barangay]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export function parseProfileAddress(address: string | null | undefined): ProfileAddressParts {
  if (!address) return EMPTY_ADDRESS_PARTS

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 4) {
    return {
      address_line_1: parts[0],
      address_line_2: parts[1],
      street_address: parts[2],
      barangay: parts[3],
    }
  }

  if (parts.length === 3) {
    return {
      address_line_1: parts[0],
      address_line_2: '',
      street_address: parts[1],
      barangay: parts[2],
    }
  }

  return {
    ...EMPTY_ADDRESS_PARTS,
    address_line_1: address,
  }
}
