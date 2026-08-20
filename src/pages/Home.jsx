import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { TitleCard } from '../components/TitleCard'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

export default function Home() {
  const { user } = useAuth()
  const [trending, setTrending] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [watchedCount, setWatchedCount] = useState(null)

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setTrending(data.items || []))
      .catch(() => setTrending([]))

    supabase
      .from('watched_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setWatchedCount(count ?? 0))
  }, [user.id])

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
    if (!error) setAddedIds((prev) => new Set(prev).add(key))
  }

  const backdrops = trending.filter((t) => t.backdrop_url).slice(0, 6)

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.backdropGrid}>
          {backdrops.map((item, i) => (
            <div
              key={i}
              style={{ ...styles.backdropTile, backgroundImage: `url(${item.backdrop_url})` }}
            />
          ))}
        </div>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <h1 style={styles.logo}>Kinolog</h1>
          <p style={styles.tagline}>Your cinema, counted.</p>
        </div>
      </div>

      <div style={styles.body}>
        {watchedCount === 0 && (
          <Link to="/onboarding" style={styles.onboardingBanner}>
            New here? Pick a few favorites to get started →
          </Link>
        )}

        <Link to="/search" style={styles.searchBar}>
          Search movies, shows, anime...
        </Link>

        <h2 style={styles.sectionTitle}>Trending This Week</h2>

        <div style={styles.grid}>
          {trending.map((item) => {
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
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, paddingBottom: '90px' },
  hero: { position: 'relative', height: '220px', overflow: 'hidden' },
  backdropGrid: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' },
  backdropTile: { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(20%)' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,23,28,0.7) 0%, rgba(22,23,28,0.97) 100%)' },
  heroContent: { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' },
  logo: { fontFamily: theme.fonts.display, fontSize: '38px', margin: 0 },
  tagline: { color: theme.colors.slate, fontSize: '13px', margin: 0 },
  body: { maxWidth: '900px', margin: '0 auto', padding: '20px 20px 40px 20px' },
  onboardingBanner: { display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', backgroundColor: theme.colors.cardBg, color: theme.colors.projectorAmber, textDecoration: 'none', fontSize: '14px', fontWeight: 600, border: `1px solid ${theme.colors.projectorAmber}`, marginBottom: '16px' },
  searchBar: { display: 'block', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.slate, textDecoration: 'none', fontSize: '15px', marginBottom: '24px' },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: '22px', margin: '0 0 12px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' },
}
