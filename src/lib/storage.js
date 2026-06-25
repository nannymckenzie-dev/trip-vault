import { supabase } from './supabase'

// File storage helpers. Objects live under `<user_id>/<trip_id>/<uuid>.<ext>`
// so the storage RLS policies (uid-prefix) apply. Buckets are private; we never
// build public URLs — callers use signedUrl() / downloadBlob().

function extOf(file) {
  const m = /\.([a-z0-9]+)$/i.exec(file.name || '')
  if (m) return m[1].toLowerCase()
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  return 'bin'
}

// Upload a File/Blob; returns the stored object path (kept in the DB file_url).
export async function uploadFile(bucket, userId, tripId, file) {
  const path = `${userId}/${tripId}/${crypto.randomUUID()}.${extOf(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (error) throw error
  return path
}

// Short-lived signed URL for a private object.
export async function signedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

// Download an object's bytes (used by the PDF viewer and the offline cache).
export async function downloadBlob(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error) throw error
  return data // Blob
}

export async function removeFile(bucket, path) {
  if (!path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
