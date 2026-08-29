export default async function handler(req, res) {
  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'Missing id' })
  }

  try {
    const [personRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/person/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      }),
      fetch(`https://api.themoviedb.org/3/person/${id}/combined_credits`, {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
      }),
    ])

    if (!personRes.ok) throw new Error('TMDB person request failed')
    const person = await personRes.json()
    const credits = creditsRes.ok ? await creditsRes.json() : { cast: [], crew: [] }

    // Combine acting and directing/creating credits into one filmography,
    // dedupe by id (a person can appear in both cast and crew for the same
    // title), sort by popularity so "Top works also by X" surfaces the
    // things worth seeing rather than every minor credit.
    // TMDB's popularity score for talk shows and news programs balloons from
    // decades of daily episodes and constant guest turnover, it isn't a signal
    // of how memorable the actual appearance was. Filter those genres out
    // before ranking, otherwise Top Works fills up with Tonight Show/Daily
    // Show credits instead of the person's actual films.
    const TALK_NEWS_GENRES = new Set([10767, 10763])

    const seen = new Map()
    const allCredits = [...(credits.cast || []), ...(credits.crew || [])]
    for (const c of allCredits) {
      if (c.media_type !== 'movie' && c.media_type !== 'tv') continue
      if (c.media_type === 'tv' && Array.isArray(c.genre_ids) && c.genre_ids.some((g) => TALK_NEWS_GENRES.has(g))) continue
      if (seen.has(c.id)) continue
      seen.set(c.id, {
        source: 'tmdb',
        external_id: String(c.id),
        media_type: c.media_type,
        title: c.media_type === 'movie' ? c.title : c.name,
        year: (c.media_type === 'movie' ? c.release_date : c.first_air_date)?.slice(0, 4) || null,
        poster_url: c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
        popularity: c.popularity || 0,
      })
    }
    const filmography = Array.from(seen.values()).sort((a, b) => b.popularity - a.popularity)

    return res.status(200).json({
      id: person.id,
      name: person.name,
      bio: person.biography || null,
      profile_url: person.profile_path ? `https://image.tmdb.org/t/p/w342${person.profile_path}` : null,
      known_for_department: person.known_for_department || null,
      filmography,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch person detail' })
  }
}
