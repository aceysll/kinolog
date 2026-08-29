// Discover Collections curation, step 1 of 2.
// Usage: node scripts/discover-generate.js "movies where Tom Cruise runs a lot" tom-cruise-runs
//
// Asks Groq for a candidate list of movies matching the theme, resolves each
// through TMDB search, writes everything to discover-drafts/<slug>.json.
// Nothing touches Supabase here. Review the draft (delete bad entries, fix
// resolved: null misses by hand) before running discover-commit.js on it.

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.backfill' })

const GROQ_API_KEY = process.env.GROQ_API_KEY
const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN

const themePrompt = process.argv[2]
const slug = process.argv[3]

if (!themePrompt || !slug) {
  console.error('Usage: node scripts/discover-generate.js "theme prompt" slug-name')
  process.exit(1)
}

if (!GROQ_API_KEY || !TMDB_TOKEN) {
  console.error('Missing GROQ_API_KEY or TMDB_READ_ACCESS_TOKEN in .env.backfill')
  process.exit(1)
}

async function generateCandidates(theme) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `List 15 real, well known movies that fit this theme: "${theme}".
Respond only with XML in this exact format, nothing else, no preamble:
<movies>
<movie><title>Movie Title</title><year>2000</year></movie>
</movies>`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq request failed: ${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  const movieBlocks = [...text.matchAll(/<movie>([\s\S]*?)<\/movie>/g)]
  return movieBlocks.map((block) => {
    const inner = block[1]
    const title = inner.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
    const year = inner.match(/<year>([\s\S]*?)<\/year>/)?.[1]?.trim()
    return { title, year: year ? Number(year) : null }
  }).filter((c) => c.title)
}

async function resolveOnTMDB(candidate) {
  const params = new URLSearchParams({ query: candidate.title, include_adult: 'false' })
  if (candidate.year) params.set('year', String(candidate.year))

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null

  const data = await res.json()
  const top = data.results?.[0]
  if (!top) return null

  return {
    source: 'tmdb',
    external_id: String(top.id),
    media_type: 'movie',
    title: top.title,
    year: top.release_date?.slice(0, 4) ? Number(top.release_date.slice(0, 4)) : null,
    poster_url: top.poster_path ? `https://image.tmdb.org/t/p/w342${top.poster_path}` : null,
    backdrop_url: top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : null,
  }
}

async function main() {
  console.log(`Generating candidates for: "${themePrompt}"`)
  const candidates = await generateCandidates(themePrompt)
  console.log(`Groq returned ${candidates.length} candidates. Resolving on TMDB...`)

  const resolved = []
  for (const c of candidates) {
    const match = await resolveOnTMDB(c)
    resolved.push({
      candidate_title: c.title,
      candidate_year: c.year,
      resolved: match,
    })
    console.log(match ? `  OK   ${c.title} -> ${match.title} (${match.year})` : `  MISS ${c.title}`)
  }

  const draft = {
    theme_prompt: themePrompt,
    slug,
    generated_at: new Date().toISOString(),
    items: resolved,
  }

  const dir = path.join(process.cwd(), 'discover-drafts')
  fs.mkdirSync(dir, { recursive: true })
  const outPath = path.join(dir, `${slug}.json`)
  fs.writeFileSync(outPath, JSON.stringify(draft, null, 2))

  const missCount = resolved.filter((r) => !r.resolved).length
  console.log(`\nWrote ${outPath}`)
  console.log(`${resolved.length - missCount} resolved, ${missCount} missed.`)
  console.log('Review the file, delete or fix entries as needed, then run discover-commit.js on it.')
}

main().catch((err) => {
  console.error('Generate failed:', err.message)
  process.exit(1)
})
