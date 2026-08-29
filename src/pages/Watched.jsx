import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Watched.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV' },
  { key: 'anime', label: 'Anime' },
]

const SORTS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'title', label: 'Title A-Z' },
  { key: 'rating', label: 'Highest rated' },
]

const BADGE_DOT = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

function StarRating({ value, onChange }) {
  const stars = [1, 2, 3, 4, 5]
  const filled = Math.round((value || 0) / 2)
  return (
    <div className="watched-stars">
      {stars.map((s) => (
        <span
          key={s}
          onClick={(e) => {
            e.stopPropagation()
            onChange(s * 2)
          }}
          className="watched-star"
          style={{ color: s <= filled ? theme.colors.projectorAmber : theme.colors.slate }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function Watched() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('watched_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('watched_date', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setEntries(data)
    }
    setLoading(false)
  }

  async function handleRatingChange(id, rating) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, rating } : e)))
    await supabase.from('watched_entries').update({ rating }).eq('id', id)
  }

  async function handleRewatchToggle(id, current) {
    const next = !current
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, rewatched: next } : e)))
    await supabase.from('watched_entries').update({ rewatched: next }).eq('id', id)
  }

  async function handleRemove(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await supabase.from('watched_entries').delete().eq('id', id)
  }

  const filtered = entries.filter((e) => filter === 'all' || e.media_type === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0)
    return new Date(b.watched_date) - new Date(a.watched_date)
  })

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
    <div className="watched-page" style={rootVars}>
      <div className="watched-content">
        <h1 className="watched-title">Watched</h1>
        <p className="watched-subtitle">{entries.length} title{entries.length === 1 ? '' : 's'} logged</p>

        <div className="sprocket-divider" />

        <div className="watched-controls">
          <div className="watched-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={filter === f.key ? 'watched-filter-btn active' : 'watched-filter-btn'}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="watched-sort-select"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading && <p className="watched-status">Loading...</p>}
        {error && <p className="watched-error">{error}</p>}
        {!loading && sorted.length === 0 && (
          <p className="watched-status">Nothing here yet. Add titles from Search.</p>
        )}

        <div className="watched-list">
          {sorted.map((entry) => (
            <div key={entry.id} className="watched-row">
              <div
                className="watched-poster-wrap"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/title/${entry.source}/${entry.media_type}/${entry.external_id}`)}
              >
                {entry.poster_url ? (
                  <img src={entry.poster_url} alt={entry.title} className="watched-poster" />
                ) : (
                  <div className="watched-poster-fallback">No image</div>
                )}
                <span className="watched-badge">
                  <span
                    className="watched-badge-dot"
                    style={{ backgroundColor: BADGE_DOT[entry.media_type] || theme.colors.slate }}
                  />
                  {entry.media_type}
                </span>
              </div>

              <div className="watched-row-info">
                <p
                  className="watched-row-title"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/title/${entry.source}/${entry.media_type}/${entry.external_id}`)}
                >
                  {entry.title}
                </p>
                <p className="watched-row-date">{entry.watched_date}</p>
                {entry.collection_id && (
                  <button
                    className="watched-franchise-link"
                    onClick={() => navigate(`/franchise/${entry.collection_id}`)}
                  >
                    {entry.collection_name || 'Part of a franchise'}
                  </button>
                )}
                <StarRating
                  value={entry.rating}
                  onChange={(rating) => handleRatingChange(entry.id, rating)}
                />
                <div className="watched-row-actions">
                  <button
                    onClick={() => handleRewatchToggle(entry.id, entry.rewatched)}
                    className={entry.rewatched ? 'watched-rewatch-btn active' : 'watched-rewatch-btn'}
                  >
                    {entry.rewatched ? 'Rewatched' : 'Mark rewatched'}
                  </button>
                  <button onClick={() => handleRemove(entry.id)} className="watched-remove-btn">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
