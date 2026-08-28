export default async function handler(req, res) {
  const { q } = req.query

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query' })
  }

  try {
    const [tmdbResults, anilistResults, personResult] = await Promise.all([
      searchTMDB(q),
      searchAniList(q),
      searchPerson(q),
    ])

    const merged = [...tmdbResults, ...anilistResults].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    )

    res.status(200).json({
      results: merged,
      person: personResult,
    })
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message })
  }
}

function isLikelyAnime(item) {
  if (item.media_type !== 'tv') return false
  const genreIds = item.genre_ids || []
  const originCountry = item.origin_country || []
  return genreIds.includes(16) && originCountry.includes('JP')
}

async function searchTMDB(query) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) return []

  const data = await response.json()
  const now = new Date()

  return data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .filter((item) => !isLikelyAnime(item))
    .slice(0, 12)
    .map((item) => {
      const releaseDateRaw = item.media_type === 'movie' ? item.release_date : item.first_air_date
      return {
        source: 'tmdb',
        external_id: String(item.id),
        media_type: item.media_type,
        title: item.media_type === 'movie' ? item.title : item.name,
        year: releaseDateRaw?.slice(0, 4) || null,
        poster_url: item.poster_path
          ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
          : null,
        backdrop_url: item.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
          : null,
        upcoming: releaseDateRaw ? new Date(releaseDateRaw) > now : false,
        popularity: item.popularity || 0,
        // Phase 3 fields: filled later via /api/tmdb-details after insert, left null here
        genres: null,
        director: null,
        cast_members: null,
        country: null,
        language: null,
      }
    })
}

// Backlog: director/person search. TMDB's search/multi only text-matches titles,
// so a name search needs its own lookup, then two credit calls filtered to Director.
async function searchPerson(query) {
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }
  )
  if (!searchRes.ok) return null

  const searchData = await searchRes.json()
  const candidates = searchData.results || []
  if (candidates.length === 0) return null

  const top = candidates[0]
  // Confidence threshold: skip low-popularity coincidental name matches,
  // e.g. someone typing a common word that happens to match an obscure person
  const isLikelyMatch = top.popularity > 5 || top.known_for_department === 'Directing'
  if (!isLikelyMatch) return null

  const [movieCreditsRes, tvCreditsRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/person/${top.id}/movie_credits`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }),
    fetch(`https://api.themoviedb.org/3/person/${top.id}/tv_credits`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }),
  ])

  const movieCredits = movieCreditsRes.ok ? await movieCreditsRes.json() : { crew: [] }
  const tvCredits = tvCreditsRes.ok ? await tvCreditsRes.json() : { crew: [] }

  const directedMovies = (movieCredits.crew || [])
    .filter((c) => c.job === 'Director')
    .map((c) => ({
      source: 'tmdb',
      external_id: String(c.id),
      media_type: 'movie',
      title: c.title,
      year: c.release_date?.slice(0, 4) || null,
      poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
      popularity: c.popularity || 0,
    }))

  const directedTV = (tvCredits.crew || [])
    .filter((c) => c.job === 'Director')
    .map((c) => ({
      source: 'tmdb',
      external_id: String(c.id),
      media_type: 'tv',
      title: c.name,
      year: c.first_air_date?.slice(0, 4) || null,
      poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
      popularity: c.popularity || 0,
    }))

  const filmography = [...directedMovies, ...directedTV].sort(
    (a, b) => b.popularity - a.popularity
  )

  if (filmography.length === 0) return null

  return {
    id: top.id,
    name: top.name,
    profile_url: top.profile_path ? `https://image.tmdb.org/t/p/w185${top.profile_path}` : null,
    filmography,
  }
}

async function searchAniList(query) {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
          format
          status
          startDate {
            year
          }
          coverImage {
            medium
          }
          bannerImage
          genres
          popularity
          staff(sort: RELEVANCE, perPage: 5) {
            edges {
              role
              node {
                name {
                  full
                }
              }
            }
          }
          characters(sort: [ROLE, RELEVANCE], perPage: 8) {
            edges {
              role
              voiceActors(language: JAPANESE) {
                name {
                  full
                }
              }
            }
          }
          countryOfOrigin
        }
      }
    }
  `

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { search: query },
    }),
  })

  if (!response.ok) return []

  const data = await response.json()
  const media = data?.data?.Page?.media || []

  return media.map((item) => {
    let director = null
    const staffEdges = item.staff?.edges || []
    for (const edge of staffEdges) {
      if (edge.role && edge.role.toLowerCase().includes('director')) {
        director = edge.node?.name?.full || null
        break
      }
    }

    // Backlog: anime cast, Japanese voice actors, top 5, main characters first
    // (query already sorts by ROLE so MAIN comes before SUPPORTING/BACKGROUND)
    const castMembers = []
    const characterEdges = item.characters?.edges || []
    for (const edge of characterEdges) {
      const va = edge.voiceActors?.[0]?.name?.full
      if (va && !castMembers.includes(va)) {
        castMembers.push(va)
      }
      if (castMembers.length >= 5) break
    }

    return {
      source: 'anilist',
      external_id: String(item.id),
      media_type: 'anime',
      title: item.title.english || item.title.romaji,
      year: item.startDate?.year || null,
      poster_url: item.coverImage?.medium || null,
      backdrop_url: item.bannerImage || null,
      upcoming: item.status === 'NOT_YET_RELEASED',
      // AniList popularity is a raw favorites/user count, much larger scale than
      // TMDB's popularity score, normalize down so it merges reasonably with TMDB items
      popularity: item.popularity ? item.popularity / 100 : 0,
      // Phase 3 fields
      genres: item.genres || [],
      director,
      cast_members: castMembers.length > 0 ? castMembers : null,
      country: item.countryOfOrigin || null,
      language: 'ja',
    }
  })
}
