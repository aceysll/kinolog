import { useState } from 'react'
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

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
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
        <Link to="/" style={styles.link}> Back</Link>
        <h1 style={styles.title}>Search</h1>
      </div>

      <form onSubmit={handleSearch} style={styles.form}>
        <input
          type="text"
          placeholder="Search movies, shows, anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

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
              <p style={styles.cardMeta}>{item.year || ''}  {item.media_type}</p>
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
  form: { display: 'flex', gap: '8px', marginBottom: '24px' },
  input: { flex: 1, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.screenGlow, fontSize: '15px' },
  button: { padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 600, cursor: 'pointer' },
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
