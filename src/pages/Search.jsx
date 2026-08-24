import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TitleCard } from '../components/TitleCard'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Search.css'

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
    const yearValue = Number(item.year)
    const { error } = await supabase.from('watched_entries').insert({
      user_id: user.id,
      media_type: item.media_type,
      source: item.source,
      external_id: item.external_id,
      title: item.title,
      poster_url: item.poster_url || null,
      year: Number.isFinite(yearValue) ? yearValue : null,
      watched_date: new Date().toISOString().slice(0, 10),
    })
    if (!error) setAddedIds((prev) => new Set(prev).add(key))
  }

  const showingResults = query.trim().length > 0
  const displayItems = showingResults ? results : trending
  const topBackdrop = displayItems.find((r) => r.backdrop_url)?.backdrop_url

  const rootVars = {
    '--charcoal': theme.colors.charcoal,
    '--cardBg': theme.colors.cardBg,
    '--slate': theme.colors.slate,
    '--amber': theme.colors.projectorAmber,
    '--velvetRed': theme.colors.velvetRed,
    '--animeTeal': theme.colors.animeTeal,
    '--screenGlow': theme.colors.screenGlow,
    '--font-display': theme.fonts.display,
    '--font-body': theme.fonts.body,
    '--font-mono': theme.fonts.mono,
  }

  return (
    <div className="search-page" style={rootVars}>
      <div
        className="search-ambient-backdrop"
        style={{
          backgroundImage: topBackdrop ? `url(${topBackdrop})` : 'none',
          opacity: topBackdrop ? 1 : 0,
        }}
      />
      <div className="search-ambient-overlay" />

      <div className="search-content">
        <p className="search-eyebrow">Discover</p>
        <h1 className="search-title">{showingResults ? 'Results' : 'Trending Now'}</h1>

        <div className="sprocket-divider" />

        <input
          type="text"
          placeholder="A title, a director, a mood..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          autoFocus
        />

        {loading && <p className="search-status">Searching...</p>}
        {error && <p className="search-error">{error}</p>}

        <div className="search-grid">
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
