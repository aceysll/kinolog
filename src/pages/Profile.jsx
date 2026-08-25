import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Profile.css'

function FilmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.projectorAmber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
      <line x1="7" y1="2" x2="7" y2="22"></line>
      <line x1="17" y1="2" x2="17" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="2" y1="7" x2="7" y2="7"></line>
      <line x1="2" y1="17" x2="7" y2="17"></line>
      <line x1="17" y1="17" x2="22" y2="17"></line>
      <line x1="17" y1="7" x2="22" y2="7"></line>
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.velvetRed} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="16"></line>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.animeTeal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  )
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const initial = user?.email?.charAt(0).toUpperCase() || '?'

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
    <div className="profile-page" style={rootVars}>
      <div className="profile-header">
        <div className="profile-avatar-ring">
          <div className="profile-avatar">{initial}</div>
        </div>
        <p className="profile-email">{user?.email}</p>
      </div>

      <div className="profile-content">
        <div className="sprocket-divider" />

        <div className="profile-nav-list">
          <Link to="/watched" className="profile-nav-link">
            <div className="profile-nav-card">
              <FilmIcon />
              <div>
                <p className="profile-nav-title">My Watched List</p>
                <p className="profile-nav-subtitle">See everything you've logged</p>
              </div>
            </div>
          </Link>

          <Link to="/stats" className="profile-nav-link">
            <div className="profile-nav-card">
              <BarChartIcon />
              <div>
                <p className="profile-nav-title">Stats</p>
                <p className="profile-nav-subtitle">Your numbers, decades, and more</p>
              </div>
            </div>
          </Link>

          <div className="profile-nav-card disabled">
            <FolderIcon />
            <div>
              <p className="profile-nav-title">Lists</p>
              <p className="profile-nav-subtitle">Coming soon</p>
            </div>
          </div>
        </div>

        <button onClick={signOut} className="profile-signout">Log out</button>
      </div>

      <BottomNav />
    </div>
  )
}
