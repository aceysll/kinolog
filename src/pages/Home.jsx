import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

const BADGE_COLORS = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

export default function Home() {
  const { user } = useAuth()
  const [backdrops, setBackdrops] = useState([])
  const [watchedCount, setWatchedCount] = useState(null)
  const [recent, setRecent] = useState([])

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
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('watched_date', { ascending: false })
      .limit(8)
      .then(({ data, count }) => {
        setWatchedCount(count ?? 0)
        setRecent(data || [])
      })
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

        {watchedCount > 0 && (
          <>
            <p style={styles.statLine}>
              You've logged <span style={styles.statNumber}>{watchedCount}</span> title{watchedCount === 1 ? '' : 's'}
            </p>

            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recently Logged</h2>
              <Link to="/watched" style={styles.seeAllLink}>See all</Link>
            </div>

            <div style={styles.recentScroll}>
              {recent.map((entry) => (
                <Link key={entry.id} to="/watched" style={styles.recentCard}>
                  <div style={styles.recentPosterWrap}>
                    {entry.poster_url ? (
                      <img src={entry.poster_url} alt={entry.title} style={styles.recentPoster} />
                    ) : (
                      <div style={styles.recentPosterFallback}>No image</div>
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
                  <p style={styles.recentTitle}>{entry.title}</p>
                </Link>
              ))}
            </div>
          </>
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
  statLine: { fontSize: '15px', color: theme.colors.slate, margin: '0 0 24px 0' },
  statNumber: { color: theme.colors.projectorAmber, fontWeight: 700, fontFamily: theme.fonts.display, fontSize: '18px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: '20px', margin: 0 },
  seeAllLink: { color: theme.colors.slate, fontSize: '12px', textDecoration: 'none' },
  recentScroll: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '28px' },
  recentCard: { flexShrink: 0, width: '110px', textDecoration: 'none', color: 'inherit' },
  recentPosterWrap: { position: 'relative' },
  recentPoster: { width: '110px', height: '165px', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  recentPosterFallback: { width: '110px', height: '165px', borderRadius: '8px', backgroundColor: theme.colors.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: theme.colors.screenGlow },
  badge: { position: 'absolute', top: '5px', left: '5px', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', color: theme.colors.charcoal, textTransform: 'uppercase' },
  recentTitle: { fontSize: '12px', fontWeight: 600, margin: '6px 0 0 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  exploreLink: { display: 'block', textAlign: 'center', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${theme.colors.slate}`, backgroundColor: theme.colors.cardBg, color: theme.colors.screenGlow, textDecoration: 'none', fontSize: '15px', fontWeight: 600 },
}
