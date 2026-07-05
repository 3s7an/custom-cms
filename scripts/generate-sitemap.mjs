/**
 * Generates public/sitemap.xml and public/robots.txt from Supabase (published content only).
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 * Optional: SITE_URL or VITE_SITE_URL — canonical origin, no trailing slash (default https://leonberger.sk)
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')

async function loadDotEnv() {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return
  const text = await readFile(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const ADMIN_PREFIXES = ['/admin', '/admin/login']

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase @param {string} table @param {string} select */
async function fetchAllRows(supabase, table, select) {
  const pageSize = 1000
  const rows = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('published', true)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toIsoDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function buildUrlEntry(loc, lastmod) {
  const lastmodLine = lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` : ''
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmodLine}  </url>\n`
}

async function main() {
  await loadDotEnv()

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://leonberger.sk').replace(
    /\/+$/,
    '',
  )

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [pages, leonbergers] = await Promise.all([
    fetchAllRows(supabase, 'pages', 'slug, updated_at'),
    fetchAllRows(supabase, 'leonbergers', 'slug, id, updated_at'),
  ])

  const entries = []
  const seen = new Set()

  const add = (path, lastmod) => {
    if (ADMIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return
    const loc = path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`
    if (seen.has(loc)) return
    seen.add(loc)
    entries.push({ loc, lastmod: toIsoDate(lastmod) })
  }

  add('/', null)

  for (const page of pages) {
    const slug = page.slug?.trim()
    if (!slug) continue
    add(`/${slug}`, page.updated_at)
  }

  for (const dog of leonbergers) {
    const slug = dog.slug?.trim()
    const segment = slug || dog.id
    if (!segment) continue
    add(`/leonberger/${segment}`, dog.updated_at)
  }

  const urlset = entries.map((e) => buildUrlEntry(e.loc, e.lastmod)).join('')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}</urlset>\n`

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/

Sitemap: ${siteUrl}/sitemap.xml
`

  await Promise.all([
    writeFile(join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8'),
    writeFile(join(PUBLIC_DIR, 'robots.txt'), robots, 'utf8'),
  ])

  console.log(
    `Wrote sitemap.xml (${entries.length} URLs) and robots.txt for ${siteUrl}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
