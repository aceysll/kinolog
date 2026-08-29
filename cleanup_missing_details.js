// One-off cleanup: some rows from the original Phase 3 fetch silently failed
// to save director/cast_members/genres/country/language, likely a swallowed
// Supabase error at insert time. This refetches full details for any tmdb
// row missing director or cast_members, filling everything in one pass,
// including director_id/cast_ids from the Phase 6 backfill.
// Reads secrets from .env.backfill (gitignored), never commit that file.
// Run with: node cleanup_missing_details.js

import { readFileSync } from 'fs'

function loadEnvFile(path) {
  const content = readFileSync(path, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
  return env
}

const env = loadEnvFile('.env.backfill')
const SUPABASE_URL = env.SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const TMDB_TOKEN = env.TMDB_READ_ACCESS_TOKEN

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TMDB_TOKEN) {
  console.error('Missing one of SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_READ_ACCESS_TOKEN in .env.backfill')
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchRowsNeedingCleanup() {
  const url = `${SUPABASE_URL}/rest/v1/watched_entries?select=id,external_id,media_type&source=eq.tmdb&or=(director.is.null,cast_members.is.null)`
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch rows: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function fetchTMDBFullDetails(mediaType, tmdbId) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?append_to_response=credits`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const data = await res.json()

  const genres = data.genres?.map((g) => g.name) || []
  let director = null
  let directorId = null
  let castMembers = []
  let castIds = []
  let country = null
  const language = data.original_language || null
  let collectionId = null
  let collectionName = null

  if (mediaType === 'movie') {
    const crew = data.credits?.crew || []
    const dir = crew.find((c) => c.job === 'Director')
    director = dir?.name || null
    directorId = dir?.id || null
    const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
    castMembers = sortedCast.slice(0, 5).map((c) => c.name)
    castIds = sortedCast.slice(0, 5).map((c) => c.id)
    country = data.production_countries?.[0]?.iso_3166_1 || null
    if (data.belongs_to_collection) {
      collectionId = data.belongs_to_collection.id
      collectionName = data.belongs_to_collection.name
    }
  } else if (mediaType === 'tv') {
    const creator = data.created_by?.[0] || null
    director = creator?.name || null
    directorId = creator?.id || null
    const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
    castMembers = sortedCast.slice(0, 5).map((c) => c.name)
    castIds = sortedCast.slice(0, 5).map((c) => c.id)
    country = data.origin_country?.[0] || null
  }

  return {
    genres,
    director,
    director_id: directorId,
    cast_members: castMembers,
    cast_ids: castIds,
    country,
    language,
    collection_id: collectionId,
    collection_name: collectionName,
  }
}

async function updateRow(rowId, patch) {
  const url = `${SUPABASE_URL}/rest/v1/watched_entries?id=eq.${rowId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(`Failed to update row ${rowId}: ${res.status} ${await res.text()}`)
  }
}

async function main() {
  const rows = await fetchRowsNeedingCleanup()
  console.log(`Found ${rows.length} rows needing full detail refetch.`)

  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    if (row.media_type !== 'movie' && row.media_type !== 'tv') {
      console.log(`SKIP id=${row.id} unexpected media_type=${row.media_type}`)
      skipped++
      continue
    }

    try {
      const details = await fetchTMDBFullDetails(row.media_type, row.external_id)
      if (!details) {
        console.log(`SKIP id=${row.id} external_id=${row.external_id} TMDB fetch failed`)
        skipped++
      } else {
        await updateRow(row.id, details)
        console.log(`OK id=${row.id} external_id=${row.external_id} director=${details.director} cast=${details.cast_members.length}`)
        succeeded++
      }
    } catch (err) {
      console.error(`FAIL id=${row.id} external_id=${row.external_id}: ${err.message}`)
      failed++
    }

    await sleep(300)
  }

  console.log(`\nDone. succeeded=${succeeded} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
