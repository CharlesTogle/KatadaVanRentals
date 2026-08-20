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
