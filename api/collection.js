// Phase 5: fetches a full TMDB collection (franchise) by id.
// Pure read against TMDB, nothing written to Supabase here.
export default async function handler(req, res) {
  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'Missing collection id' })
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/collection/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      }
    )
    if (!response.ok) throw new Error('TMDB collection request failed')
    const data = await response.json()

    const now = new Date()
    const parts = (data.parts || [])
      .map((item) => ({
        source: 'tmdb',
        external_id: String(item.id),
        media_type: 'movie',
        title: item.title,
        year: item.release_date?.slice(0, 4) || null,
        poster_url: item.poster_path
          ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
          : null,
        upcoming: item.release_date ? new Date(item.release_date) > now : false,
        release_date: item.release_date || null,
      }))
      .sort((a, b) => {
        if (!a.release_date) return 1
        if (!b.release_date) return -1
        return new Date(a.release_date) - new Date(b.release_date)
      })

    return res.status(200).json({
      id: data.id,
      name: data.name,
      overview: data.overview || null,
      poster_url: data.poster_path
        ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
        : null,
      backdrop_url: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : null,
      parts,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch collection' })
  }
}
