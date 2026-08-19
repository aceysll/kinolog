cat > api/trending.js << 'EOF'
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
EOF

cat > src/pages/Home.jsx << 'EOF'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { theme } from '../theme'

export default function Home() {
  const { user, signOut } = useAuth()
  const [backdrops, setBackdrops] = useState([])
  const [watchedCount, setWatchedCount] = useState(null)

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setBackdrops(data.items || []))
      .catch(() => setBackdrops([]))

    supabase
      .from('watched_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setWatchedCount(count ?? 0))
  }, [user.id])

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.backdropGrid}>
          {backdrops.map((item, i) => (
            <div
              key={i}
              style={{
                ...styles.backdropTile,
                backgroundImage: `url(${item.backdrop_url})`,
              }}
            />
          ))}
        </div>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <h1 style={styles.logo}>Kinolog</h1>
          <p style={styles.tagline}>Your cinema, counted.</p>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.statusRow}>
          <p style={styles.greeting}>{user?.email}</p>
          <p style={styles.count}>
            {watchedCount === null ? '...' : watchedCount} titles logged
          </p>
        </div>

        <Link to="/search" style={styles.primaryCta}>
          Search &amp; Add Titles
        </Link>

        <div style={styles.navRow}>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>My Watched List</p>
            <p style={styles.navSubtitle}>Coming soon</p>
          </div>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>Stats</p>
            <p style={styles.navSubtitle}>Unlocks once you log titles</p>
          </div>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>Lists</p>
            <p style={styles.navSubtitle}>Coming soon</p>
          </div>
        </div>

        <button onClick={signOut} style={styles.signOut}>Log out</button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow },
  hero: { position: 'relative', height: '260px', overflow: 'hidden' },
  backdropGrid: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' },
  backdropTile: { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(20%)' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,23,28,0.75) 0%, rgba(22,23,28,0.95) 100%)' },
  heroContent: { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  logo: { fontFamily: theme.fonts.display, fontSize: '44px', margin: 0, letterSpacing: '1px' },
  tagline: { color: theme.colors.slate, fontSize: '14px', margin: 0 },
  body: { maxWidth: '480px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  statusRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: theme.colors.slate },
  greeting: { margin: 0 },
  count: { margin: 0, color: theme.colors.projectorAmber },
  primaryCta: { textAlign: 'center', padding: '16px', borderRadius: '10px', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 700, textDecoration: 'none', fontSize: '16px' },
  navRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  navCard: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '14px 10px', textAlign: 'center' },
  navTitle: { fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' },
  navSubtitle: { fontSize: '11px', color: theme.colors.slate, margin: 0 },
  signOut: { alignSelf: 'center', marginTop: '8px', padding: '8px 18px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '13px', cursor: 'pointer' },
}
EOF

cat > src/pages/Search.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedIds, setAddedIds] = useState(new Set())
  const { user } = useAuth()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeout = setTimeout(() => {
      runSearch(query)
    }, 400)

    return () => clearTimeout(timeout)
  }, [query])

  async function runSearch(q) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(item) {
    const key = `${item.source}-${item.external_id}`
    const { error } = await supabase.from('watched_entries').insert({
      user_id: user.id,
      media_type: item.media_type,
      source: item.source,
      external_id: item.external_id,
      title: item.title,
      watched_date: new Date().toISOString().slice(0, 10),
    })
    if (!error) {
      setAddedIds((prev) => new Set(prev).add(key))
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link to="/" style={styles.link}>← Back</Link>
        <h1 style={styles.title}>Search</h1>
      </div>

      <input
        type="text"
        placeholder="Search movies, shows, anime..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.input}
        autoFocus
      />

      {loading && <p style={styles.status}>Searching...</p>}
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.grid}>
        {results.map((item) => {
          const key = `${item.source}-${item.external_id}`
          const added = addedIds.has(key)
          return (
            <div key={key} style={styles.card}>
              {item.poster_url ? (
                <img src={item.poster_url} alt={item.title} style={styles.poster} />
              ) : (
                <div style={styles.posterFallback}>No image</div>
              )}
              <p style={styles.cardTitle}>{item.title}</p>
              <p style={styles.cardMeta}>{item.year || '—'} · {item.media_type}</p>
              <button
                onClick={() => handleAdd(item)}
                disabled={added}
                style={added ? styles.addedButton : styles.addButton}
              >
                {added ? 'Added' : 'Add to watched'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, padding: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  link: { color: theme.colors.projectorAmber, textDecoration: 'none', fontSize: '14px' },
  title: { fontFamily: theme.fonts.display, fontSize: '28px', margin: 0 },
  input: { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.screenGlow, fontSize: '16px', marginBottom: '16px' },
  status: { color: theme.colors.slate, fontSize: '13px', marginBottom: '12px' },
  error: { color: theme.colors.velvetRed, marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' },
  card: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  poster: { width: '100%', borderRadius: '6px', aspectRatio: '2/3', objectFit: 'cover' },
  posterFallback: { width: '100%', aspectRatio: '2/3', borderRadius: '6px', backgroundColor: theme.colors.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: theme.colors.screenGlow },
  cardTitle: { fontSize: '13px', fontWeight: 600, margin: 0, lineHeight: 1.3 },
  cardMeta: { fontSize: '11px', color: theme.colors.slate, margin: 0, textTransform: 'capitalize' },
  addButton: { padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 600, fontSize: '12px', cursor: 'pointer' },
  addedButton: { padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: theme.colors.slate, color: theme.colors.screenGlow, fontWeight: 600, fontSize: '12px', cursor: 'default' },
}
EOF

echo "Homepage and live search created."
