import { resizeImageFile } from '@/lib/resize-image'
import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'

/** Resizes, uploads, and returns the new avatar's public URL. Cleans up the person's previous avatar file(s) after a successful upload. */
export async function uploadPersonAvatar(networkId: string, personId: string, file: File): Promise<string> {
  const resized = await resizeImageFile(file)
  const path = `${networkId}/${personId}-${Date.now()}.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, resized, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error

  await deletePersonAvatars(networkId, personId, path)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Removes all avatar files for a person (optionally keeping one path), so replacing/removing a person never leaves orphaned Storage files. */
export async function deletePersonAvatars(networkId: string, personId: string, exceptPath?: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(networkId, { search: personId })
  if (error || !data) return

  const paths = data.map((f) => `${networkId}/${f.name}`).filter((p) => p !== exceptPath)
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths)
  }
}
