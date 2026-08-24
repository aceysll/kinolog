export default async function handler(req, res) {
  try {
    const [tmdbItems, anilistItems] = await Promise.all([
      fetchTMDBTopRated(),
      fetchAniListFavourites(),
    ])

    res.status(200).json({ items: [...tmdbItems, ...anilistItems] })
  } catch (err) {
    res.status(500).json({ error: 'Popular fetch failed', details: err.message })
  }
}

function isLikelyAnime(item) {
  if (item.media_type !== 'tv') return false
  const genreIds = item.genre_ids || []
  const originCountry = item.origin_country || []
  return genreIds.includes(16) && originCountry.includes('JP')
}

const MIN_VOTE_COUNT = 3000

async function fetchTMDBPages(path, headers, pages) {
  const requests = pages.map((page) =>
    fetch(`https://api.themoviedb.org/3/${path}?page=${page}`, { headers })
  )
  const responses = await Promise.all(requests)
  const datas = await Promise.all(
    responses.map((r) => (r.ok ? r.json() : { results: [] }))
  )
  return datas.flatMap((d) => d.results || [])
}

async function fetchTMDBTopRated() {
  const headers = {
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    Accept: 'application/json',
  }

  const [movieResults, tvResults] = await Promise.all([
    fetchTMDBPages('movie/top_rated', headers, [1, 2, 3]),
    fetchTMDBPages('tv/top_rated', headers, [1, 2, 3]),
  ])

  const now = new Date()

  const movies = movieResults
    .filter((item) => item.vote_count >= MIN_VOTE_COUNT)
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 8)
    .map((item) => ({ media_type: 'movie', raw: item }))

  const tv = tvResults
    .filter((item) => item.vote_count >= MIN_VOTE_COUNT)
    .filter((item) => !isLikelyAnime({ ...item, media_type: 'tv' }))
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 8)
    .map((item) => ({ media_type: 'tv', raw: item }))

  return [...movies, ...tv].map(({ media_type, raw }) => {
    const releaseDateRaw = media_type === 'movie' ? raw.release_date : raw.first_air_date
    return {
      source: 'tmdb',
      external_id: String(raw.id),
      media_type,
      title: media_type === 'movie' ? raw.title : raw.name,
      year: releaseDateRaw?.slice(0, 4) || null,
      poster_url: raw.poster_path
        ? `https://image.tmdb.org/t/p/w342${raw.poster_path}`
        : null,
      backdrop_url: raw.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}`
        : null,
      upcoming: releaseDateRaw ? new Date(releaseDateRaw) > now : false,
    }
  })
}

async function fetchAniListFavourites() {
  const query = `
    query {
      Page(page: 1, perPage: 8) {
        media(sort: FAVOURITES_DESC, type: ANIME) {
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
