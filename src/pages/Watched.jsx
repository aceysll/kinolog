import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

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

const BADGE_COLORS = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

function StarRating({ value, onChange }) {
  const stars = [1, 2, 3, 4, 5]
  const filled = Math.round((value || 0) / 2)
  return (
    <div style={styles.stars}>
      {stars.map((s) => (
        <span
          key={s}
          onClick={(e) => {
            e.stopPropagation()
            onChange(s * 2)
          }}
          style={{
            ...styles.star,
            color: s <= filled ? theme.colors.projectorAmber : theme.colors.slate,
          }}
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

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.title}>Watched</h1>
        <p style={styles.subtitle}>{entries.length} title{entries.length === 1 ? '' : 's'} logged</p>

        <div style={styles.controls}>
          <div style={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={filter === f.key ? styles.filterActive : styles.filterInactive}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={styles.sortSelect}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading && <p style={styles.status}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}
        {!loading && sorted.length === 0 && (
          <p style={styles.status}>Nothing here yet. Add titles from Search.</p>
        )}

        <div style={styles.list}>
          {sorted.map((entry) => (
            <div key={entry.id} style={styles.row}>
              <div style={styles.posterWrap}>
                {entry.poster_url ? (
                  <img src={entry.poster_url} alt={entry.title} style={styles.poster} />
                ) : (
                  <div style={styles.posterFallback}>No image</div>
                )}
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: BADGE_COLORS[entry.media_type] || theme.colors.slate,
                  }}
                >
                  {entry.media_type}
                </span>
              </div>

              <div style={styles.rowInfo}>
                <p style={styles.rowTitle}>{entry.title}</p>
                <p style={styles.rowDate}>{entry.watched_date}</p>
                <StarRating
                  value={entry.rating}
                  onChange={(rating) => handleRatingChange(entry.id, rating)}
                />
                <div style={styles.rowActions}>
                  <button
                    onClick={() => handleRewatchToggle(entry.id, entry.rewatched)}
                    style={entry.rewatched ? styles.rewatchActive : styles.rewatchInactive}
                  >
                    {entry.rewatched ? 'Rewatched' : 'Mark rewatched'}
                  </button>
                  <button onClick={() => handleRemove(entry.id)} style={styles.removeButton}>
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

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, paddingBottom: '90px' },
  content: { maxWidth: '700px', margin: '0 auto', padding: '32px 20px 24px 20px' },
  title: { fontFamily: theme.fonts.display, fontSize: '36px', margin: '0 0 4px 0' },
  subtitle: { color: theme.colors.slate, fontSize: '13px', margin: '0 0 20px 0' },
  controls: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  filterRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filterActive: { padding: '8px 14px', borderRadius: '20px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 700, fontSize: '12px', cursor: 'pointer' },
  filterInactive: { padding: '8px 14px', borderRadius: '20px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '12px', cursor: 'pointer' },
  sortSelect: { padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.screenGlow, fontSize: '13px', alignSelf: 'flex-start' },
  status: { color: theme.colors.slate, fontSize: '13px', marginBottom: '12px' },
  error: { color: theme.colors.velvetRed, marginBottom: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '14px', backgroundColor: theme.colors.cardBg, borderRadius: '12px', padding: '12px' },
  posterWrap: { position: 'relative', flexShrink: 0, width: '70px' },
  poster: { width: '70px', height: '105px', borderRadius: '6px', objectFit: 'cover', display: 'block' },
  posterFallback: { width: '70px', height: '105px', borderRadius: '6px', backgroundColor: theme.colors.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: theme.colors.screenGlow, textAlign: 'center' },
  badge: { position: 'absolute', top: '4px', left: '4px', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', color: theme.colors.charcoal, textTransform: 'uppercase' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: '15px', fontWeight: 600, margin: '0 0 2px 0' },
  rowDate: { fontSize: '11px', color: theme.colors.slate, margin: '0 0 8px 0' },
  stars: { display: 'flex', gap: '2px', marginBottom: '10px', cursor: 'pointer' },
  star: { fontSize: '16px' },
  rowActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  rewatchActive: { padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: theme.colors.animeTeal, color: theme.colors.charcoal, fontSize: '10px', fontWeight: 700, cursor: 'pointer' },
  rewatchInactive: { padding: '5px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '10px', cursor: 'pointer' },
  removeButton: { padding: '5px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.velvetRed}`, backgroundColor: 'transparent', color: theme.colors.velvetRed, fontSize: '10px', cursor: 'pointer' },
}
