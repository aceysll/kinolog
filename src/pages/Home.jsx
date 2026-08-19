import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { theme } from '../theme'

export default function Home() {
  const { user, signOut } = useAuth()
  const [backdrops, setBackdrops] = useState([])
  const [watchedCount, setWatchedCount] = useState(null)

  useEffect(() => {
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setBackdrops(data.items || []))
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
              style={{
                ...styles.backdropTile,
                backgroundImage: `url(${item.backdrop_url})`,
              }}
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
        <div style={styles.statusRow}>
          <p style={styles.greeting}>{user?.email}</p>
          <p style={styles.count}>
            {watchedCount === null ? '...' : watchedCount} titles logged
          </p>
        </div>

        <Link to="/search" style={styles.primaryCta}>
          Search &amp; Add Titles
        </Link>

        <div style={styles.navRow}>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>My Watched List</p>
            <p style={styles.navSubtitle}>Coming soon</p>
          </div>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>Stats</p>
            <p style={styles.navSubtitle}>Unlocks once you log titles</p>
          </div>
          <div style={styles.navCard}>
            <p style={styles.navTitle}>Lists</p>
            <p style={styles.navSubtitle}>Coming soon</p>
          </div>
        </div>

        <button onClick={signOut} style={styles.signOut}>Log out</button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow },
  hero: { position: 'relative', height: '260px', overflow: 'hidden' },
  backdropGrid: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' },
  backdropTile: { backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(20%)' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,23,28,0.75) 0%, rgba(22,23,28,0.95) 100%)' },
  heroContent: { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  logo: { fontFamily: theme.fonts.display, fontSize: '44px', margin: 0, letterSpacing: '1px' },
  tagline: { color: theme.colors.slate, fontSize: '14px', margin: 0 },
  body: { maxWidth: '480px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  statusRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: theme.colors.slate },
  greeting: { margin: 0 },
  count: { margin: 0, color: theme.colors.projectorAmber },
  primaryCta: { textAlign: 'center', padding: '16px', borderRadius: '10px', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 700, textDecoration: 'none', fontSize: '16px' },
  navRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  navCard: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '14px 10px', textAlign: 'center' },
  navTitle: { fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' },
  navSubtitle: { fontSize: '11px', color: theme.colors.slate, margin: 0 },
  signOut: { alignSelf: 'center', marginTop: '8px', padding: '8px 18px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '13px', cursor: 'pointer' },
}
