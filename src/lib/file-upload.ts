interface UploadPolicy {
  maxBytes: number
  allowedMimeTypes: readonly string[]
  accept: string
}


export function getAcceptedMimeTypes(policy: UploadPolicy): string {
  return policy.accept
}

export function validateFile(file: File, policy: UploadPolicy): void {
  if (file.size > policy.maxBytes) {
    throw new Error(`File is too large. Maximum size is ${policy.maxBytes / (1024 * 1024)} MiB.`)
  }
  if (!policy.allowedMimeTypes.includes(file.type)) {
    throw new Error(`Unsupported file type. Allowed types: ${policy.allowedMimeTypes.join(', ')}.`)
  }
}
