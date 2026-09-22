const MAX_EDGE = 512
const JPEG_QUALITY = 0.82

/**
 * Resizes an image file to fit within MAX_EDGE x MAX_EDGE (preserving
 * aspect ratio) and re-encodes it as JPEG, so avatar uploads don't carry
 * an unbounded original file size to Storage.
 */
export async function resizeImageFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Failed to encode image')
  return blob
}
