/**
 * Downloads all objects from Supabase Storage buckets (service role).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SUPABASE_STORAGE_BUCKETS — comma-separated bucket ids; if unset, all buckets.
 * Output: ./storage-backup/<bucket>/... (then workflow tars this folder)
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, '..', 'storage-backup')

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketsFilter = process.env.SUPABASE_STORAGE_BUCKETS?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** @returns {Promise<string[]>} object paths relative to bucket root */
async function listObjectPaths(bucket, prefix = '') {
  const paths = []
  const limit = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data?.length) break

    for (const item of data) {
      const rel = prefix ? `${prefix}/${item.name}` : item.name
      // Folders are placeholders with no id; files have id.
      if (item.id) {
        paths.push(rel)
      } else {
        paths.push(...(await listObjectPaths(bucket, rel)))
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  return paths
}

async function main() {
  const { data: allBuckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) throw listErr

  let buckets = allBuckets ?? []
  if (bucketsFilter?.length) {
    const allowed = new Set(bucketsFilter)
    const matched = buckets.filter((b) => allowed.has(b.id))
    const missing = bucketsFilter.filter((id) => !matched.some((b) => b.id === id))
    if (missing.length) {
      console.warn('Buckets not found or not accessible:', missing.join(', '))
    }
    if (!matched.length) {
      console.error('SUPABASE_STORAGE_BUCKETS did not match any bucket.')
      process.exit(1)
    }
    buckets = matched
  }

  if (!buckets.length) {
    console.warn('No buckets to back up.')
    await mkdir(OUT_ROOT, { recursive: true })
    await writeFile(join(OUT_ROOT, '.empty'), '', 'utf8')
    return
  }

  let fileCount = 0

  for (const bucket of buckets) {
    const objectPaths = await listObjectPaths(bucket.id)
    for (const objectPath of objectPaths) {
      const { data, error } = await supabase.storage.from(bucket.id).download(objectPath)
      if (error) throw error

      const buf = Buffer.from(await data.arrayBuffer())
      const dest = join(OUT_ROOT, bucket.id, objectPath)
      await mkdir(dirname(dest), { recursive: true })
      await writeFile(dest, buf)
      fileCount += 1
    }
  }

  console.log(`Backed up ${fileCount} file(s) from ${buckets.length} bucket(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
