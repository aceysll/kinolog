import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TitleCard } from '../components/TitleCard'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Discover.css'

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('franchises')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [gallery, setGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [addedIds, setAddedIds] = useState(new Set())
  const [recommendations, setRecommendations] = useState([])
  const [recLoading, setRecLoading] = useState(true)
  const [recTried, setRecTried] = useState(false)

  // Same race condition guard pattern as Search.jsx: ignore a slow response
  // that resolves after a newer request has already fired.
  const latestRequestId = useRef(0)

  useEffect(() => {
    fetch('/api/discover-collections')
      .then((res) => res.json())
      .then((data) => setGallery(data.collections || []))
      .catch(() => setGallery([]))
      .finally(() => setGalleryLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    loadLibraryAndRecommendations()
  }, [user])

  async function loadLibraryAndRecommendations() {
    const { data, error } = await supabase
      .from('watched_entries')
      .select('source, external_id, title, year, genres, director')
      .eq('user_id', user.id)

    if (error || !data) {
      setRecLoading(false)
      return
    }

    const keys = data.map((row) => `${row.source}-${row.external_id}`)
    setAddedIds(new Set(keys))

    if (data.length === 0) {
      setRecLoading(false)
      setRecTried(true)
      return
    }

    const genres = aggregateArrayField(data, 'genres')
    const directors = aggregateScalarField(data, 'director')
    const excludeExternalIds = data.filter((d) => d.source === 'tmdb').map((d) => d.external_id)
    const excludeTitles = data.map((d) => `${d.title}${d.year ? ` (${d.year})` : ''}`)

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genres, directors, excludeExternalIds, excludeTitles }),
      })
      const result = await res.json()
      setRecommendations(result.recommendations || [])
    } catch {
      setRecommendations([])
    } finally {
      setRecLoading(false)
      setRecTried(true)
    }
  }

  function aggregateArrayField(entries, field) {
    const counts = {}
    entries.forEach((entry) => {
      const list = entry[field]
      if (Array.isArray(list)) {
        list.forEach((item) => {
          counts[item] = (counts[item] || 0) + 1
        })
      }
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }

  function aggregateScalarField(entries, field) {
    const counts = {}
    entries.forEach((entry) => {
      const val = entry[field]
      if (val) counts[val] = (counts[val] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }

  // Phase 3 pattern, same as Search.jsx: fills genres/director/cast/country/language
  // after a TMDB entry is saved.
  async function fetchTMDBDetails(entryId, tmdbId, mediaType) {
    try {
      const res = await fetch(`/api/tmdb-details?media_type=${mediaType}&id=${tmdbId}`)
      if (!res.ok) throw new Error('TMDB detail fetch failed')
      const data = await res.json()
      const { genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name } = data
      await supabase
        .from('watched_entries')
        .update({
          genres,
          director,
          director_id,
          cast_members,
          cast_ids,
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

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchParams({}, { replace: true })
      return
    }
    const timeout = setTimeout(() => {
      runSearch(query)
      setSearchParams({ q: query }, { replace: true })
    }, 400)
    return () => clearTimeout(timeout)
  }, [query])

  async function runSearch(q) {
    const requestId = ++latestRequestId.current
    setSearchLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/discover-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      if (requestId !== latestRequestId.current) return
      setSearchResults(data.collections || [])
    } catch (err) {
      if (requestId !== latestRequestId.current) return
      setError(err.message)
    } finally {
      if (requestId === latestRequestId.current) setSearchLoading(false)
    }
  }

  const showingSearch = query.trim().length > 0
  const displayItems = showingSearch ? searchResults : gallery
  const isLoading = showingSearch ? searchLoading : galleryLoading

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
    <div className="discover-page" style={rootVars}>
      <div className="discover-content">
        <p className="discover-eyebrow">Discover</p>
        <h1 className="discover-title">
          {activeTab === 'franchises' ? (showingSearch ? 'Results' : 'Franchises') : 'For You'}
        </h1>

        <div className="sprocket-divider" />

        <div className="discover-tabs">
          <button
            type="button"
            className={`discover-tab${activeTab === 'franchises' ? ' active' : ''}`}
            onClick={() => setActiveTab('franchises')}
          >
            Franchises
          </button>
          <button
            type="button"
            className={`discover-tab${activeTab === 'foryou' ? ' active' : ''}`}
            onClick={() => setActiveTab('foryou')}
          >
            For You
          </button>
        </div>

        {activeTab === 'franchises' && (
          <>
            <div className="discover-input-wrap">
              <input
                type="text"
                placeholder="Search any franchise..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="discover-input"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="discover-input-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {isLoading && <p className="discover-status">Loading...</p>}
            {error && <p className="discover-error">{error}</p>}

            {!isLoading && displayItems.length === 0 && (
              <p className="discover-empty-note">
                {showingSearch ? 'No franchises found.' : 'Nothing to show yet.'}
              </p>
            )}

            <div className="discover-gallery">
              {displayItems.map((c) => (
                <div
                  key={c.id}
                  className="discover-gallery-item"
                  onClick={() => navigate(`/franchise/${c.id}`)}
                >
                  {c.poster_url ? (
                    <img src={c.poster_url} alt={c.name} className="discover-gallery-poster" />
                  ) : (
                    <div className="discover-gallery-poster-fallback" />
                  )}
                  <p className="discover-gallery-name">{c.name}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'foryou' && (
          <div className="discover-rec-section">
            {recLoading && <p className="discover-status">Finding picks for you...</p>}
            {!recLoading && recTried && recommendations.length === 0 && (
              <p className="discover-empty-note">
                Log a few more titles and recommendations will show up here.
              </p>
            )}
            {recommendations.length > 0 && (
              <div className="discover-rec-grid">
                {recommendations.map((item) => {
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
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
