import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [personResult, setPersonResult] = useState(null)
  const [collectionResult, setCollectionResult] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setTrending(data.items || []))
      .catch(() => setTrending([]))
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchExisting = async () => {
      const { data, error } = await supabase
        .from('watched_entries')
        .select('source, external_id')
        .eq('user_id', user.id)
      if (!error && data) {
        const keys = data.map((row) => `${row.source}-${row.external_id}`)
        setAddedIds(new Set(keys))
      }
    }
    fetchExisting()
  }, [user])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setPersonResult(null)
      setCollectionResult(null)
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
      setPersonResult(data.person || null)
      setCollectionResult(data.collection || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Phase 3: fires after a TMDB entry is saved, fills genres/director/cast/country/language
  // Phase 5: also fills collection_id/collection_name when the title belongs to a franchise
  async function fetchTMDBDetails(entryId, tmdbId, mediaType) {
    try {
      const res = await fetch(`/api/tmdb-details?media_type=${mediaType}&id=${tmdbId}`)
      if (!res.ok) throw new Error('TMDB detail fetch failed')
      const data = await res.json()
      const { genres, director, cast_members, country, language, collection_id, collection_name } = data
      await supabase
        .from('watched_entries')
        .update({
          genres,
          director,
          cast_members,
          country,
          language,
          collection_id,
          collection_name,
        })
        .eq('id', entryId)
    } catch (err) {
      console.error('TMDB detail fetch failed:', err)
    }
  }

  async function handleAdd(item) {
    const key = `${item.source}-${item.external_id}`
    const yearValue = Number(item.year)

    const insertData = {
      user_id: user.id,
      media_type: item.media_type,
      source: item.source,
      external_id: item.external_id,
      title: item.title,
      poster_url: item.poster_url || null,
      year: Number.isFinite(yearValue) ? yearValue : null,
      watched_date: new Date().toISOString().slice(0, 10),
    }

    if (item.source === 'anilist') {
      insertData.genres = item.genres || null
      insertData.director = item.director || null
      insertData.cast_members = item.cast_members || null
      insertData.country = item.country || null
      insertData.language = item.language || null
    }

    const { data, error } = await supabase
      .from('watched_entries')
      .insert(insertData)
      .select('id')

    if (error) {
      console.error('Insert error:', error)
      return
    }

    setAddedIds((prev) => new Set(prev).add(key))

    if (item.source === 'tmdb' && data && data.length > 0) {
      fetchTMDBDetails(data[0].id, item.external_id, item.media_type)
    }
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

        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="A title, a director, a franchise..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="search-input-clear"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {loading && <p className="search-status">Searching...</p>}
        {error && <p className="search-error">{error}</p>}

        {collectionResult && (
          <div
            className="search-collection-banner"
            onClick={() => navigate(`/franchise/${collectionResult.id}`)}
          >
            {collectionResult.poster_url && (
              <img
                src={collectionResult.poster_url}
                alt={collectionResult.name}
                className="search-collection-poster"
              />
            )}
            <div className="search-collection-info">
              <p className="search-collection-eyebrow">Franchise</p>
              <p className="search-collection-name">{collectionResult.name}</p>
            </div>
          </div>
        )}

        {personResult && (
          <div className="search-person-section">
            <div className="search-person-header">
              {personResult.profile_url && (
                <img
                  src={personResult.profile_url}
                  alt={personResult.name}
                  className="search-person-photo"
                />
              )}
              <p className="search-person-name">Directed by {personResult.name}</p>
            </div>
            <div className="search-grid">
              {personResult.filmography.map((item) => {
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
            <div className="sprocket-divider" />
          </div>
        )}

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
