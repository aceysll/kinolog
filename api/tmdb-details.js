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
    let directorId = null
    let castMembers = []
    let castIds = []
    let country = null
    const language = data.original_language || null
    let collectionId = null
    let collectionName = null

    if (media_type === 'movie') {
      const crew = data.credits?.crew || []
      const dir = crew.find((c) => c.job === 'Director')
      director = dir?.name || null
      directorId = dir?.id || null
      const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
      castMembers = sortedCast.slice(0, 5).map((c) => c.name)
      castIds = sortedCast.slice(0, 5).map((c) => c.id)
      country = data.production_countries?.[0]?.iso_3166_1 || null

      // Phase 5: belongs_to_collection only exists on the movie details endpoint,
      // TV has no equivalent concept on TMDB, so collection stays null for TV.
      if (data.belongs_to_collection) {
        collectionId = data.belongs_to_collection.id
        collectionName = data.belongs_to_collection.name
      }
    } else if (media_type === 'tv') {
      // TMDB's created_by entries carry the person id directly, same shape
      // as a crew credit for our purposes.
      const creator = data.created_by?.[0] || null
      director = creator?.name || null
      directorId = creator?.id || null
      const sortedCast = (data.credits?.cast || []).sort((a, b) => a.order - b.order)
      castMembers = sortedCast.slice(0, 5).map((c) => c.name)
      castIds = sortedCast.slice(0, 5).map((c) => c.id)
      country = data.origin_country?.[0] || null
    }

    return res.status(200).json({
      genres,
      director,
      director_id: directorId,
      cast_members: castMembers,
      cast_ids: castIds,
      country,
      language,
      collection_id: collectionId,
      collection_name: collectionName,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch TMDB details' })
  }
}
