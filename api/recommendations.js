// Discover "Recommended For You". Client aggregates genres/directors from
// watched_entries (same pattern as the Profile taste fingerprint) and posts
// it here. Groq suggests candidates, TMDB resolves them, anything matching
// an external_id the user already has gets filtered out before returning.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { genres = [], directors = [], excludeExternalIds = [], excludeTitles = [] } = req.body || {}

  if (genres.length === 0 && directors.length === 0) {
    return res.status(200).json({ recommendations: [] })
  }

  try {
    const candidates = await generateRecommendations({ genres, directors, excludeTitles })
    const resolved = await Promise.all(candidates.map(resolveOnTMDB))

    const excludeSet = new Set(excludeExternalIds.map(String))
    const seen = new Set()
    const recommendations = resolved.filter((r) => {
      if (!r) return false
      if (excludeSet.has(r.external_id)) return false
      if (seen.has(r.external_id)) return false
      seen.add(r.external_id)
      return true
    })

    res.status(200).json({ recommendations: recommendations.slice(0, 12) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations', details: err.message })
  }
}

async function generateRecommendations({ genres, directors, excludeTitles }) {
  const genreList = genres.map(([name, count]) => `${name} (${count})`).join(', ')
  const directorList = directors.map(([name, count]) => `${name} (${count})`).join(', ')
  const excludeList = excludeTitles.slice(0, 40).join(', ')

  const prompt = `Based on this person's watch history, suggest 15 real movies they would likely enjoy but have not seen.

Top genres they watch (with counts): ${genreList || 'none recorded'}
Directors they watch often: ${directorList || 'none recorded'}

Do not suggest any of these, they have already seen them: ${excludeList || 'none'}

Respond only with XML in this exact format, nothing else, no preamble:
<movies>
<movie><title>Movie Title</title><year>2000</year></movie>
</movies>`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Groq request failed: ${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  const movieBlocks = [...text.matchAll(/<movie>([\s\S]*?)<\/movie>/g)]
  return movieBlocks
    .map((block) => {
      const inner = block[1]
      const title = inner.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
      const year = inner.match(/<year>([\s\S]*?)<\/year>/)?.[1]?.trim()
      return { title, year: year ? Number(year) : null }
    })
    .filter((c) => c.title)
}

async function resolveOnTMDB(candidate) {
  const params = new URLSearchParams({ query: candidate.title, include_adult: 'false' })
  if (candidate.year) params.set('year', String(candidate.year))

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null

  const data = await res.json()
  const top = data.results?.[0]
  if (!top || top.adult) return null

  return {
    source: 'tmdb',
    external_id: String(top.id),
    media_type: 'movie',
    title: top.title,
    year: top.release_date?.slice(0, 4) || null,
    poster_url: top.poster_path ? `https://image.tmdb.org/t/p/w342${top.poster_path}` : null,
    backdrop_url: top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : null,
    upcoming: false,
    popularity: top.popularity || 0,
    genres: null,
    director: null,
    cast_members: null,
    country: null,
    language: null,
  }
}
