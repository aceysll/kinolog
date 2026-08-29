import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'
import './Onboarding.css'

const BADGE_COLORS = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

const MIN_PICKS = 3
const MAX_PICKS = 10

export default function Onboarding() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/popular')
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

  function toggleSelect(item) {
    const key = `${item.source}-${item.external_id}`
    setSelected((prev) => {
      const exists = prev.find((p) => `${p.source}-${p.external_id}` === key)
      if (exists) {
        return prev.filter((p) => `${p.source}-${p.external_id}` !== key)
      }
      if (prev.length >= MAX_PICKS) return prev
      return [...prev, item]
    })
  }

  // Phase 3: fires after a TMDB entry is saved, fills genres/director/cast/country/language
  async function fetchTMDBDetails(entryId, tmdbId, mediaType) {
    try {
      const res = await fetch(`/api/tmdb-details?media_type=${mediaType}&id=${tmdbId}`)
      if (!res.ok) throw new Error('TMDB detail fetch failed')
      const data = await res.json()
      const { genres, director, director_id, cast_members, cast_ids, country, language } = data
      await supabase
        .from('watched_entries')
        .update({ genres, director, director_id, cast_members, cast_ids, country, language })
        .eq('id', entryId)
    } catch (err) {
      console.error('TMDB detail fetch failed:', err)
    }
  }

  async function handleFinish() {
    setSaving(true)
    const rows = selected.map((item) => {
      const yearValue = Number(item.year)
      const row = {
        user_id: user.id,
        media_type: item.media_type,
        source: item.source,
        external_id: item.external_id,
        title: item.title,
        poster_url: item.poster_url || null,
        year: Number.isFinite(yearValue) ? yearValue : null,
        watched_date: new Date().toISOString().slice(0, 10),
        rating: 10,
      }
      if (item.source === 'anilist') {
        row.genres = item.genres || null
        row.director = item.director || null
        row.cast_members = item.cast_members || null
        row.country = item.country || null
        row.language = item.language || null
      }
      return row
    })

    const { data, error } = await supabase
      .from('watched_entries')
      .insert(rows)
      .select('id, source, external_id, media_type')

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }

    if (data) {
      data.forEach((entry) => {
        if (entry.source === 'tmdb') {
          fetchTMDBDetails(entry.id, entry.external_id, entry.media_type)
        }
      })
    }

    navigate('/')
  }

  function handleSkip() {
    navigate('/')
  }

  const showingResults = query.trim().length > 0
  const displayItems = showingResults ? results : trending
  const selectedKeys = new Set(selected.map((s) => `${s.source}-${s.external_id}`))

  const rootVars = {
    '--charcoal': theme.colors.charcoal,
    '--cardBg': theme.colors.cardBg,
    '--slate': theme.colors.slate,
    '--amber': theme.colors.projectorAmber,
    '--velvetRed': theme.colors.velvetRed,
    '--screenGlow': theme.colors.screenGlow,
    '--font-display': theme.fonts.display,
    '--font-body': theme.fonts.body,
    '--font-mono': theme.fonts.mono,
  }

  return (
    <div className="onboarding-page" style={rootVars}>
      <div className="onboarding-content">
        <h1 className="onboarding-title">What do you love?</h1>
        <p className="onboarding-subtitle">
          Pick a few favorites to get started.{' '}
          <span className="onboarding-count">{selected.length}/{MAX_PICKS}</span> selected
          {selected.length < MIN_PICKS ? ` (pick at least ${MIN_PICKS})` : ''}
        </p>

        <div className="sprocket-divider" />

        <input
          type="text"
          placeholder="Search movies, shows, anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="onboarding-search"
          autoFocus
        />

        <p className="onboarding-section-label">
          {showingResults ? 'Results' : 'Popular Picks'}
        </p>

        {loading && <p className="onboarding-status">Searching...</p>}
        {error && <p className="onboarding-error">{error}</p>}

        <div className="onboarding-grid">
          {displayItems.map((item) => {
            const key = `${item.source}-${item.external_id}`
            const isSelected = selectedKeys.has(key)
            return (
              <div
                key={key}
                onClick={() => toggleSelect(item)}
                className={`onboarding-card${isSelected ? ' selected' : ''}`}
              >
                <div className="onboarding-poster-wrap">
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} className="onboarding-poster" />
                  ) : (
                    <div className="onboarding-poster-fallback">No image</div>
                  )}
                  <span
                    className="onboarding-badge"
                    style={{ backgroundColor: BADGE_COLORS[item.media_type] || theme.colors.slate }}
                  >
                    {item.media_type}
                  </span>
                  {isSelected && <div className="onboarding-check">✓</div>}
                </div>
                <p className="onboarding-card-title">{item.title}</p>
              </div>
            )
          })}
        </div>

        <div className="sprocket-divider" />
      </div>

      <div className="onboarding-footer">
        <button onClick={handleSkip} className="onboarding-skip">Skip for now</button>
        <button
          onClick={handleFinish}
          disabled={selected.length < MIN_PICKS || saving}
          className="onboarding-finish"
        >
          {saving ? 'Saving...' : `Finish (${selected.length})`}
        </button>
      </div>
    </div>
  )
}
