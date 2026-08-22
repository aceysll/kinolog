import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TitleCard } from '../components/TitleCard'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedIds, setAddedIds] = useState(new Set())
  const { user } = useAuth()

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setTrending(data.items || []))
      .catch(() => setTrending([]))
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => runSearch(query), 400)
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
      poster_url: item.poster_url || null,
      watched_date: new Date().toISOString().slice(0, 10),
    })
    if (!error) setAddedIds((prev) => new Set(prev).add(key))
  }

  const showingResults = query.trim().length > 0
  const displayItems = showingResults ? results : trending
  const topBackdrop = displayItems.find((r) => r.backdrop_url)?.backdrop_url

  return (
    <div style={styles.page}>
      <div
        style={{
          ...styles.ambientBackdrop,
          backgroundImage: topBackdrop ? `url(${topBackdrop})` : 'none',
          opacity: topBackdrop ? 1 : 0,
        }}
      />
      <div style={styles.ambientOverlay} />

      <div style={styles.content}>
        <h1 style={styles.title}>{showingResults ? 'Results' : 'Trending Now'}</h1>

        <input
          type="text"
          placeholder="A title, a director, a mood..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          autoFocus
        />

        {loading && <p style={styles.status}>Searching...</p>}
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.grid}>
          {displayItems.map((item) => {
            const key = `${item.source}-${item.external_id}`
            return (
              <TitleCard
                key={key}
                item={item}
                added={addedIds.has(key)}
                onAdd={handleAdd}
              />
            )
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, position: 'relative', overflow: 'hidden', paddingBottom: '90px' },
  ambientBackdrop: { position: 'fixed', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(24px) brightness(0.4)', transition: 'opacity 0.6s ease', zIndex: 0 },
  ambientOverlay: { position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(22,23,28,0.85) 0%, rgba(22,23,28,0.98) 60%)', zIndex: 0 },
  content: { position: 'relative', zIndex: 1, padding: '24px', maxWidth: '900px', margin: '0 auto' },
  title: { fontFamily: theme.fonts.display, fontSize: '32px', margin: '0 0 20px 0' },
  input: { width: '100%', boxSizing: 'border-box', padding: '16px 18px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'rgba(28,30,36,0.85)', color: theme.colors.screenGlow, fontSize: '17px', marginBottom: '20px' },
  status: { color: theme.colors.slate, fontSize: '13px', marginBottom: '12px' },
  error: { color: theme.colors.velvetRed, marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px' },
}
