import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'

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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.avatar}>{initial}</div>
        <p style={styles.email}>{user?.email}</p>
      </div>

      <div style={styles.content}>
        <div style={styles.navList}>
          <Link to="/watched" style={styles.navLink}>
            <div style={styles.navCard}>
              <FilmIcon />
              <div>
                <p style={styles.navTitle}>My Watched List</p>
                <p style={styles.navSubtitle}>See everything you've logged</p>
              </div>
            </div>
          </Link>
          <div style={styles.navCard}>
            <BarChartIcon />
            <div>
              <p style={styles.navTitle}>Stats</p>
              <p style={styles.navSubtitle}>Unlocks once you log titles</p>
            </div>
          </div>
          <div style={styles.navCard}>
            <FolderIcon />
            <div>
              <p style={styles.navTitle}>Lists</p>
              <p style={styles.navSubtitle}>Coming soon</p>
            </div>
          </div>
        </div>

        <button onClick={signOut} style={styles.signOut}>Log out</button>
      </div>

      <BottomNav />
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, paddingBottom: '90px' },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 24px 32px 24px', background: `linear-gradient(180deg, ${theme.colors.cardBg} 0%, ${theme.colors.charcoal} 100%)` },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 700, fontFamily: theme.fonts.display },
  email: { color: theme.colors.slate, fontSize: '13px', margin: 0, wordBreak: 'break-all', textAlign: 'center' },
  content: { maxWidth: '480px', margin: '0 auto', padding: '24px' },
  navList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  navLink: { textDecoration: 'none', color: 'inherit' },
  navCard: { backgroundColor: theme.colors.cardBg, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' },
  navTitle: { fontSize: '15px', fontWeight: 600, margin: '0 0 2px 0' },
  navSubtitle: { fontSize: '12px', color: theme.colors.slate, margin: 0 },
  signOut: { width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '14px', cursor: 'pointer' },
}
