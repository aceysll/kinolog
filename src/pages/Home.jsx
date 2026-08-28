import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Home.css'

const BADGE_DOT = {
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
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data, count }) => {
        setWatchedCount(count ?? 0)
        setRecent(data || [])
      })
  }, [user.id])

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
    <div className="home-page" style={rootVars}>
      <div className="home-hero">
        <div className="home-backdrop-grid">
          {backdrops.map((item, i) => (
            <div
              key={i}
              className="home-backdrop-tile"
              style={{ backgroundImage: `url(${item.backdrop_url})` }}
            />
          ))}
        </div>
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <h1 className="home-logo">Kinolog</h1>
          <p className="home-tagline">Your cinema, counted</p>
        </div>
      </div>

      <div className="home-body">
        <div className="sprocket-divider" />

        {watchedCount === 0 && (
          <Link to="/onboarding" className="home-onboarding-banner">
            New here? Pick a few favorites to get started →
          </Link>
        )}

        {watchedCount > 0 && (
          <>
            <p className="home-stat-eyebrow">Library</p>
            <div className="home-stat-line">
              <span className="home-stat-number">{watchedCount}</span>
              <span className="home-stat-label">title{watchedCount === 1 ? '' : 's'} logged</span>
            </div>

            <p className="home-section-eyebrow">Latest</p>
            <div className="home-section-header">
              <h2 className="home-section-title">Recently Logged</h2>
              <Link to="/watched" className="home-see-all">See all</Link>
            </div>

            <div className="home-recent-scroll">
              {recent.map((entry) => (
                <Link key={entry.id} to="/watched" className="home-recent-card">
                  <div className="home-recent-poster-wrap">
                    {entry.poster_url ? (
                      <img src={entry.poster_url} alt={entry.title} className="home-recent-poster" />
                    ) : (
                      <div className="home-recent-poster-fallback">No image</div>
                    )}
                    <span className="home-badge">
                      <span
                        className="home-badge-dot"
                        style={{ backgroundColor: BADGE_DOT[entry.media_type] || theme.colors.slate }}
                      />
                      {entry.media_type}
                    </span>
                  </div>
                  <p className="home-recent-title">{entry.title}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <Link to="/search" className="home-explore-link">
          Explore trending movies, shows, and anime →
        </Link>
      </div>

      <BottomNav />
    </div>
  )
}
