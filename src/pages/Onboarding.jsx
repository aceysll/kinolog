import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

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

  async function handleFinish() {
    setSaving(true)
    const rows = selected.map((item) => ({
      user_id: user.id,
      media_type: item.media_type,
      source: item.source,
      external_id: item.external_id,
      title: item.title,
      poster_url: item.poster_url || null,
      watched_date: new Date().toISOString().slice(0, 10),
      rating: 10,
    }))
    const { error } = await supabase.from('watched_entries').insert(rows)
    setSaving(false)
    if (!error) {
      navigate('/')
    } else {
      setError(error.message)
    }
  }

  function handleSkip() {
    navigate('/')
  }

  const selectedKeys = new Set(selected.map((s) => `${s.source}-${s.external_id}`))

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.title}>What do you love?</h1>
        <p style={styles.subtitle}>
          Pick a few favorites to get started. {selected.length}/{MAX_PICKS} selected
          {selected.length < MIN_PICKS ? ` (pick at least ${MIN_PICKS})` : ''}
        </p>

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
            const isSelected = selectedKeys.has(key)
            return (
              <div
                key={key}
                onClick={() => toggleSelect(item)}
                style={{
                  ...styles.card,
                  outline: isSelected ? `2px solid ${theme.colors.projectorAmber}` : 'none',
                }}
              >
                <div style={styles.posterWrap}>
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} style={styles.poster} />
                  ) : (
                    <div style={styles.posterFallback}>No image</div>
                  )}
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: BADGE_COLORS[item.media_type] || theme.colors.slate,
                    }}
                  >
                    {item.media_type}
                  </span>
                  {isSelected && <div style={styles.selectedCheck}>✓</div>}
                </div>
                <p style={styles.cardTitle}>{item.title}</p>
              </div>
            )
          })}
        </div>

        <div style={styles.footer}>
          <button onClick={handleSkip} style={styles.skipButton}>Skip for now</button>
          <button
            onClick={handleFinish}
            disabled={selected.length < MIN_PICKS || saving}
            style={selected.length < MIN_PICKS || saving ? styles.finishButtonDisabled : styles.finishButton}
          >
            {saving ? 'Saving...' : `Finish (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow },
  content: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px 100px 24px' },
  title: { fontFamily: theme.fonts.display, fontSize: '36px', margin: '0 0 8px 0' },
  subtitle: { color: theme.colors.slate, fontSize: '14px', margin: '0 0 24px 0' },
  input: { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.screenGlow, fontSize: '16px', marginBottom: '20px' },
  status: { color: theme.colors.slate, fontSize: '13px', marginBottom: '12px' },
  error: { color: theme.colors.velvetRed, marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px' },
  card: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '8px', cursor: 'pointer' },
  posterWrap: { position: 'relative' },
  poster: { width: '100%', borderRadius: '6px', aspectRatio: '2/3', objectFit: 'cover', display: 'block' },
  posterFallback: { width: '100%', aspectRatio: '2/3', borderRadius: '6px', backgroundColor: theme.colors.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: theme.colors.screenGlow },
  badge: { position: 'absolute', top: '6px', left: '6px', fontSize: '9px', fontWeight: 700, padding: '3px 7px', borderRadius: '20px', color: theme.colors.charcoal, textTransform: 'uppercase' },
  selectedCheck: { position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' },
  cardTitle: { fontSize: '12px', fontWeight: 600, margin: '6px 0 0 0', lineHeight: 1.3 },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '16px 24px', backgroundColor: theme.colors.charcoal, borderTop: `1px solid ${theme.colors.cardBg}` },
  skipButton: { padding: '12px 20px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '14px', cursor: 'pointer' },
  finishButton: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  finishButtonDisabled: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: theme.colors.slate, color: theme.colors.screenGlow, fontWeight: 700, fontSize: '14px', cursor: 'not-allowed' },
}
