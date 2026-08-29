// Phase 7: Discover tab default gallery. TMDB has no "popular collections"
// endpoint, so this resolves a curated list of well-known franchise names
// to their real TMDB collection via the same search+detail pattern
// search.js uses for collection search, then caches the result for a day
// since the list barely changes and this avoids ~100 TMDB calls per visit.

const CURATED_FRANCHISES = [
  'Marvel Cinematic Universe',
  'Star Wars Collection',
  'Harry Potter Collection',
  'The Fast and the Furious Collection',
  'James Bond Collection',
  'The Lord of the Rings Collection',
  'The Hobbit Collection',
  'Spider-Man (Sam Raimi) Collection',
  'The Amazing Spider-Man Collection',
  'Spider-Man: Spider-Verse Collection',
  'X-Men Collection',
  'Batman Collection',
  'The Dark Knight Collection',
  'Jurassic Park Collection',
  'Jurassic World Collection',
  'Toy Story Collection',
  'Shrek Collection',
  'Despicable Me Collection',
  'John Wick Collection',
  'Mission: Impossible Collection',
  'Transformers Collection',
  'The Hunger Games Collection',
  'Pirates of the Caribbean Collection',
  'Alien Collection',
  'Predator Collection',
  'Terminator Collection',
  'Rocky Collection',
  'Creed Collection',
  'The Matrix Collection',
  'Twilight Collection',
  'Ice Age Collection',
  'Kung Fu Panda Collection',
  'How to Train Your Dragon Collection',
  'The Conjuring Universe',
  'Halloween Collection',
  'Saw Collection',
  'A Nightmare on Elm Street Collection',
  'Scream Collection',
  'Indiana Jones Collection',
  'Back to the Future Collection',
  'Ghostbusters Collection',
  'Men in Black Collection',
  'National Treasure Collection',
  'The Bourne Collection',
  'Rambo Collection',
  'Die Hard Collection',
  'The Karate Kid Collection',
  'Godzilla (Legendary) Collection',
]

export default async function handler(req, res) {
  try {
    const resolved = await Promise.all(
      CURATED_FRANCHISES.map((name) => resolveCollection(name))
    )

    const seen = new Set()
    const collections = resolved.filter((c) => {
      if (!c) return false
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json({ collections })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load discover gallery', details: err.message })
  }
}

async function resolveCollection(name) {
  try {
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/collection?query=${encodeURIComponent(name)}&include_adult=false`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const top = (searchData.results || [])[0]
    if (!top) return null

    const detailRes = await fetch(`https://api.themoviedb.org/3/collection/${top.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    })
    if (!detailRes.ok) return null
    const detail = await detailRes.json()
    const parts = detail.parts || []
    if (parts.length === 0) return null
    if (parts.some((p) => p.adult)) return null

    return {
      id: top.id,
      name: top.name,
      poster_url: top.poster_path ? `https://image.tmdb.org/t/p/w342${top.poster_path}` : null,
      backdrop_url: top.backdrop_path ? `https://image.tmdb.org/t/p/w1280${top.backdrop_path}` : null,
      part_count: parts.length,
    }
  } catch {
    return null
  }
}
