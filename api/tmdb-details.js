export default async function handler(req, res) {
  const { media_type, id } = req.query
  if (!media_type || !id) {
    return res.status(400).json({ error: 'Missing media_type or id' })
  }

  const url = `https://api.themoviedb.org/3/${media_type}/${id}?append_to_response=credits`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    })
    if (!response.ok) throw new Error('TMDB request failed')
    const data = await response.json()

    const genres = data.genres?.map((g) => g.name) || []
    let director = null
    let castMembers = []
    let country = null
    const language = data.original_language || null

    if (media_type === 'movie') {
      const crew = data.credits?.crew || []
      const dir = crew.find((c) => c.job === 'Director')
      director = dir?.name || null
      const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
      castMembers = sortedCast.slice(0, 5).map((c) => c.name)
      country = data.production_countries?.[0]?.iso_3166_1 || null
    } else if (media_type === 'tv') {
      director = data.created_by?.[0]?.name || null
      const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
      castMembers = sortedCast.slice(0, 5).map((c) => c.name)
      country = data.origin_country?.[0] || null
    }

    return res.status(200).json({
      genres,
      director,
      cast_members: castMembers,
      country,
      language,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch TMDB details' })
  }
}
