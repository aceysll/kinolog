export default async function handler(req, res) {
  const { q } = req.query

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing search query' })
  }

  try {
    const [tmdbResults, anilistResults] = await Promise.all([
      searchTMDB(q),
      searchAniList(q),
    ])

    res.status(200).json({
      results: [...tmdbResults, ...anilistResults],
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
        // Phase 3 fields: filled later via /api/tmdb-details after insert, left null here
        genres: null,
        director: null,
        cast_members: null,
        country: null,
        language: null,
      }
    })
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

    return {
      source: 'anilist',
      external_id: String(item.id),
      media_type: 'anime',
      title: item.title.english || item.title.romaji,
      year: item.startDate?.year || null,
      poster_url: item.coverImage?.medium || null,
      backdrop_url: item.bannerImage || null,
      upcoming: item.status === 'NOT_YET_RELEASED',
      // Phase 3 fields
      genres: item.genres || [],
      director,
      cast_members: null, // skipped for anime, dub language ambiguity, revisit later
      country: item.countryOfOrigin || null,
      language: 'ja',
    }
  })
}
