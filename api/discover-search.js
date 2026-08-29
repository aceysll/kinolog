// Phase 7: dedicated franchise search for the Discover tab. This replaces
// the collection search that used to live inline in api/search.js, now
// returning up to 12 matches instead of 4 since it has the whole page to
// itself rather than sharing space with title and person results.

export default async function handler(req, res) {
  const { q } = req.query

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query' })
  }

  try {
    const collections = await searchCollections(q)
    res.status(200).json({ collections })
  } catch (err) {
    res.status(500).json({ error: 'Discover search failed', details: err.message })
  }
}

async function searchCollections(query) {
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/collection?query=${encodeURIComponent(query)}&include_adult=false`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }
  )
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()

  // TMDB's collection search results carry no adult flag, that field only
  // exists on movie/tv objects. Pull a wider pool, check each candidate's
  // actual movies for the adult flag, drop anything unsafe.
  const rawCandidates = (searchData.results || []).slice(0, 20)
  if (rawCandidates.length === 0) return []

  const details = await Promise.all(
    rawCandidates.map((c) =>
      fetch(`https://api.themoviedb.org/3/collection/${c.id}`, {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  )

  const safeCandidates = rawCandidates.filter((c, i) => {
    const d = details[i]
    if (!d) return false
    const parts = d.parts || []
    if (parts.length === 0) return false
    if (parts.some((p) => p.adult)) return false
    return true
  })

  return safeCandidates.slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
    backdrop_url: c.backdrop_path ? `https://image.tmdb.org/t/p/w1280${c.backdrop_path}` : null,
  }))
}
