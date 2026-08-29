// One-off backfill: fills director_id and cast_ids for existing watched_entries
// rows sourced from tmdb, using the same credit-resolution logic as api/tmdb-details.js.
// Reads secrets from .env.backfill (gitignored), never commit that file.
// Run with: node backfill_person_ids.js

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

async function fetchRowsNeedingBackfill() {
  const url = `${SUPABASE_URL}/rest/v1/watched_entries?select=id,external_id,media_type&source=eq.tmdb&director_id=is.null`
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

async function fetchTMDBCredits(mediaType, tmdbId) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?append_to_response=credits`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const data = await res.json()

  let directorId = null
  let castIds = []

  if (mediaType === 'movie') {
    const crew = data.credits?.crew || []
    const dir = crew.find((c) => c.job === 'Director')
    directorId = dir?.id || null
    const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
    castIds = sortedCast.slice(0, 5).map((c) => c.id)
  } else if (mediaType === 'tv') {
    const creator = data.created_by?.[0] || null
    directorId = creator?.id || null
    const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
    castIds = sortedCast.slice(0, 5).map((c) => c.id)
  }

  return { director_id: directorId, cast_ids: castIds }
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
  const rows = await fetchRowsNeedingBackfill()
  console.log(`Found ${rows.length} rows to backfill.`)

  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    // media_type in watched_entries can be 'movie', 'tv', or 'anime'. Anime
    // is sourced from anilist, not tmdb, so it can't appear here given the
    // source=eq.tmdb filter, but guard anyway in case of bad historical data.
    if (row.media_type !== 'movie' && row.media_type !== 'tv') {
      console.log(`SKIP id=${row.id} unexpected media_type=${row.media_type}`)
      skipped++
      continue
    }

    try {
      const credits = await fetchTMDBCredits(row.media_type, row.external_id)
      if (!credits) {
        console.log(`SKIP id=${row.id} external_id=${row.external_id} TMDB fetch failed`)
        skipped++
      } else {
        await updateRow(row.id, credits)
        console.log(`OK id=${row.id} external_id=${row.external_id} director_id=${credits.director_id} cast_ids=${credits.cast_ids.length}`)
        succeeded++
      }
    } catch (err) {
      console.error(`FAIL id=${row.id} external_id=${row.external_id}: ${err.message}`)
      failed++
    }

    // Stay well under TMDB's ~40-50 req/10s limit.
    await sleep(300)
  }

  console.log(`\nDone. succeeded=${succeeded} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
