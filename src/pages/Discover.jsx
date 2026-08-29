import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Discover.css'

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [gallery, setGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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
        <p className="discover-eyebrow">Franchises</p>
        <h1 className="discover-title">{showingSearch ? 'Results' : 'Discover'}</h1>

        <div className="sprocket-divider" />

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
      </div>

      <BottomNav />
    </div>
  )
}
