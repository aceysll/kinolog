export default async function handler(req, res) {
  try {
    const [tmdbItems, anilistItems] = await Promise.all([
      fetchTMDBTrending(),
      fetchAniListTrending(),
    ])

    res.status(200).json({ items: [...tmdbItems, ...anilistItems] })
  } catch (err) {
    res.status(500).json({ error: 'Trending failed', details: err.message })
  }
}

async function fetchTMDBTrending() {
  const response = await fetch('https://api.themoviedb.org/3/trending/all/week', {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) return []

  const data = await response.json()
  const now = new Date()

  return data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 14)
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
      }
    })
}

async function fetchAniListTrending() {
  const query = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME) {
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
    body: JSON.stringify({ query }),
  })

  if (!response.ok) return []

  const data = await response.json()
  const media = data?.data?.Page?.media || []

  return media.map((item) => ({
    source: 'anilist',
    external_id: String(item.id),
    media_type: 'anime',
    title: item.title.english || item.title.romaji,
    year: item.startDate?.year || null,
    poster_url: item.coverImage?.medium || null,
    backdrop_url: item.bannerImage || null,
    upcoming: item.status === 'NOT_YET_RELEASED',
  }))
}
