export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.themoviedb.org/3/trending/all/week', {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'TMDB request failed' })
    }

    const data = await response.json()

    const items = data.results
      .filter((item) => item.backdrop_path)
      .slice(0, 12)
      .map((item) => ({
        title: item.title || item.name,
        backdrop_url: `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
      }))

    res.status(200).json({ items })
  } catch (err) {
    res.status(500).json({ error: 'Trending failed', details: err.message })
  }
}
