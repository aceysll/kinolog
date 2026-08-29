// Discover Collections curation, step 2 of 2.
// Usage: node scripts/discover-commit.js discover-drafts/tom-cruise-runs.json \
//          --title "Movies Where Tom Cruise Runs A Lot" --category action
//
// Reads a draft written by discover-generate.js, skips any entry with
// resolved: null (or entries you deleted), inserts the collection and
// its items into Supabase using the service role key.

import dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.backfill' })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const draftPath = process.argv[2]
const args = process.argv.slice(3)

function getFlag(name) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : null
}

const title = getFlag('title')
const category = getFlag('category')
const description = getFlag('description') || null

if (!draftPath || !title || !category) {
  console.error('Usage: node scripts/discover-commit.js <draft.json> --title "..." --category "..." [--description "..."]')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.backfill')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const raw = fs.readFileSync(draftPath, 'utf-8')
  const draft = JSON.parse(raw)

  const items = (draft.items || []).filter((i) => i.resolved)
  if (items.length === 0) {
    console.error('No resolved items in this draft, nothing to commit.')
    process.exit(1)
  }

  const coverPosterUrl = items[0].resolved.poster_url || null

  const { data: collection, error: collectionError } = await supabase
    .from('discover_collections')
    .insert({
      title,
      description,
      category,
      theme_prompt: draft.theme_prompt || null,
      cover_poster_url: coverPosterUrl,
    })
    .select('*')
    .single()

  if (collectionError) {
    console.error('Failed to insert collection:', collectionError.message)
    process.exit(1)
  }

  const rows = items.map((item, index) => ({
    collection_id: collection.id,
    source: item.resolved.source,
    external_id: item.resolved.external_id,
    media_type: item.resolved.media_type,
    title: item.resolved.title,
    year: item.resolved.year,
    poster_url: item.resolved.poster_url,
    backdrop_url: item.resolved.backdrop_url,
    sort_order: index,
  }))

  const { error: itemsError } = await supabase
    .from('discover_collection_items')
    .insert(rows)

  if (itemsError) {
    console.error('Failed to insert items, collection row was still created:', itemsError.message)
    console.error(`Collection id: ${collection.id}`)
    process.exit(1)
  }

  console.log(`Committed "${title}" (${category}) with ${rows.length} items.`)
  console.log(`Collection id: ${collection.id}`)
}

main().catch((err) => {
  console.error('Commit failed:', err.message)
  process.exit(1)
})
