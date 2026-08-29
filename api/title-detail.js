export default async function handler(req, res) {
  const { source, media_type, id } = req.query
  if (!source || !media_type || !id) {
    return res.status(400).json({ error: 'Missing source, media_type, or id' })
  }

  try {
    if (source === 'tmdb') {
      const data = await fetchTMDBTitleDetail(media_type, id)
      return res.status(200).json(data)
    }
    if (source === 'anilist') {
      const data = await fetchAniListTitleDetail(id)
      return res.status(200).json(data)
    }
    return res.status(400).json({ error: 'Unknown source' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch title detail' })
  }
}

async function fetchTMDBTitleDetail(mediaType, id) {
  const response = await fetch(
    `https://api.themoviedb.org/3/${mediaType}/${id}?append_to_response=credits`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    }
  )
  if (!response.ok) throw new Error('TMDB request failed')
  const data = await response.json()

  const crew = data.credits?.crew || []
  const cast = (data.credits?.cast || [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 15)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || null,
      profile_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }))

  let director = null
  if (mediaType === 'movie') {
    const dir = crew.find((c) => c.job === 'Director')
    director = dir
      ? {
          id: dir.id,
          name: dir.name,
          profile_url: dir.profile_path ? `https://image.tmdb.org/t/p/w185${dir.profile_path}` : null,
        }
      : null
  } else {
    const creator = data.created_by?.[0] || null
    director = creator
      ? {
          id: creator.id,
          name: creator.name,
          profile_url: creator.profile_path ? `https://image.tmdb.org/t/p/w185${creator.profile_path}` : null,
        }
      : null
  }

  return {
    source: 'tmdb',
    media_type: mediaType,
    external_id: String(id),
    title: mediaType === 'movie' ? data.title : data.name,
    overview: data.overview || null,
    year: (mediaType === 'movie' ? data.release_date : data.first_air_date)?.slice(0, 4) || null,
    poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
    backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
    genres: data.genres?.map((g) => g.name) || [],
    runtime: mediaType === 'movie' ? data.runtime || null : null,
    episode_count: mediaType === 'tv' ? data.number_of_episodes || null : null,
    season_count: mediaType === 'tv' ? data.number_of_seasons || null : null,
    director,
    cast,
    country: mediaType === 'movie'
      ? data.production_countries?.[0]?.iso_3166_1 || null
      : data.origin_country?.[0] || null,
    language: data.original_language || null,
    collection_id: data.belongs_to_collection?.id || null,
    collection_name: data.belongs_to_collection?.name || null,
  }
}

async function fetchAniListTitleDetail(id) {
  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        description(asHtml: false)
        format
        episodes
        startDate { year }
        coverImage { large }
        bannerImage
        genres
        countryOfOrigin
        staff(sort: RELEVANCE, perPage: 10) {
          edges {
            role
            node { id name { full } image { medium } }
          }
        }
        characters(sort: [ROLE, RELEVANCE], perPage: 15) {
          edges {
            role
            node { name { full } image { medium } }
            voiceActors(language: JAPANESE) { name { full } }
          }
        }
      }
    }
  `

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: graphqlQuery, variables: { id: Number(id) } }),
  })
  if (!response.ok) throw new Error('AniList request failed')
  const json = await response.json()
  const data = json?.data?.Media
  if (!data) throw new Error('Title not found')

  let director = null
  for (const edge of data.staff?.edges || []) {
    if (edge.role && edge.role.toLowerCase().includes('director')) {
      director = {
        id: edge.node?.id || null,
        name: edge.node?.name?.full || null,
        profile_url: edge.node?.image?.medium || null,
      }
      break
    }
  }

  const cast = (data.characters?.edges || []).map((edge) => ({
    id: null,
    name: edge.voiceActors?.[0]?.name?.full || edge.node?.name?.full || 'Unknown',
    character: edge.node?.name?.full || null,
    profile_url: edge.node?.image?.medium || null,
  }))

  return {
    source: 'anilist',
    media_type: 'anime',
    external_id: String(id),
    title: data.title?.english || data.title?.romaji,
    overview: data.description ? data.description.replace(/<[^>]+>/g, '') : null,
    year: data.startDate?.year || null,
    poster_url: data.coverImage?.large || null,
    backdrop_url: data.bannerImage || null,
    genres: data.genres || [],
    runtime: null,
    episode_count: data.episodes || null,
    season_count: null,
    director,
    cast,
    country: data.countryOfOrigin || null,
    language: 'ja',
    collection_id: null,
    collection_name: null,
  }
}
