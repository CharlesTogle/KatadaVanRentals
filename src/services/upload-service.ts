import { supabase } from '@/lib/supabase'
import { validateFile } from '@/lib/file-upload'

export async function uploadFile({
  bucket,
  file,
  path,
  policy,
  upsert = false,
}: {
  bucket: string
  file: File
  path: string
  policy: Parameters<typeof validateFile>[1]
  upsert?: boolean
}): Promise<string> {
  validateFile(file, policy)
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert })
  if (error) throw error
  return path
}

export async function removeUploadedFile(bucket: string, path: string | string[]): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove(Array.isArray(path) ? path : [path])
  if (error) throw error
}

export async function removeUploadedFileWithQueue(bucket: string, path: string | string[]): Promise<void> {
  try {
    await removeUploadedFile(bucket, path)
  } catch (error) {
    const paths = Array.isArray(path) ? path : [path]
    await Promise.all(paths.map((filePath) => queueUploadedFileCleanup(bucket, filePath)))
    throw error
  }
}

export async function removeUploadedFileByUrl(bucket: string, publicUrl: string): Promise<void> {
  const marker = `/${bucket}/`
  const path = decodeURIComponent(new URL(publicUrl).pathname.split(marker)[1] || '')
  if (path) await removeUploadedFile(bucket, path)
}

export async function removeUploadedFileByUrlWithQueue(bucket: string, publicUrl: string): Promise<void> {
  const marker = `/${bucket}/`
  const path = decodeURIComponent(new URL(publicUrl).pathname.split(marker)[1] || '')
  if (path) await removeUploadedFileWithQueue(bucket, path)
}

export async function queueUploadedFileCleanup(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.from('storage_cleanup_queue').insert({ bucket, file_path: path })
  if (error && error.code !== '23505') throw error
}
