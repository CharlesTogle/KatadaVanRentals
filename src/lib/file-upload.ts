interface UploadPolicy {
  maxBytes: number
  allowedMimeTypes: readonly string[]
  accept: string
}

export async function resizeImageToWebp(file: File, maxDimension = 512, quality = 0.82): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to read the selected image.'))
      image.src = url
    })

    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Unable to read the selected image.')

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image compression is not supported by this browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) return reject(new Error('Image compression failed.'))
        if (result.type.toLowerCase() !== 'image/webp') return reject(new Error('This browser cannot encode profile photos as WebP.'))
        resolve(result)
      }, 'image/webp', quality)
    })

    const filename = file.name.replace(/\.[^.]+$/, '') || 'profile-photo'
    return new File([blob], `${filename}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function prepareUploadFile(
  file: File,
  policy: UploadPolicy,
  maxDimension = 2400,
  quality = 0.92,
): Promise<File> {
  validateFile(file, policy)
  getFileExtension(file)
  if (!file.type.startsWith('image/') || file.size <= 256 * 1024) return file

  let compressed: File
  try {
    compressed = await resizeImageToWebp(file, maxDimension, quality)
  } catch {
    return file
  }
  const prepared = compressed.size < file.size ? compressed : file
  validateFile(prepared, policy)
  return prepared
}

export function getFileExtension(file: File): string {
  const lastDot = file.name.lastIndexOf('.')
  const hasExtension = lastDot > 0 && lastDot < file.name.length - 1
  const extensionByMimeType: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }

  if (!hasExtension) throw new Error('File name must include an extension.')
  return extensionByMimeType[file.type] || file.name.slice(lastDot + 1).toLowerCase()
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
