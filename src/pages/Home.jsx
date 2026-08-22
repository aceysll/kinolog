import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

export default function Home() {
  const { user } = useAuth()
  const [backdrops, setBackdrops] = useState([])
  const [watchedCount, setWatchedCount] = useState(null)

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => {
        const items = data.items || []
        setBackdrops(items.filter((t) => t.backdrop_url).slice(0, 6))
      })
      .catch(() => setBackdrops([]))

    supabase
      .from('watched_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setWatchedCount(count ?? 0))
  }, [user.id])

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

        <Link to="/search" style={styles.exploreLink}>
          Explore trending movies, shows, and anime →
        </Link>
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
  exploreLink: { display: 'block', textAlign: 'center', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.screenGlow, textDecoration: 'none', fontSize: '15px', fontWeight: 600 },
}
