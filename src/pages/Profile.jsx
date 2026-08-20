import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

export default function Profile() {
  const { user, signOut } = useAuth()

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <Link to="/" style={styles.back}>← Back</Link>
        <h1 style={styles.title}>Profile</h1>
        <p style={styles.email}>{user?.email}</p>

        <div style={styles.navList}>
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
  content: { maxWidth: '480px', margin: '0 auto', padding: '24px' },
  back: { color: theme.colors.projectorAmber, textDecoration: 'none', fontSize: '14px' },
  title: { fontFamily: theme.fonts.display, fontSize: '32px', margin: '12px 0 4px 0' },
  email: { color: theme.colors.slate, fontSize: '14px', margin: '0 0 24px 0' },
  navList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  navCard: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '16px' },
  navTitle: { fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' },
  navSubtitle: { fontSize: '12px', color: theme.colors.slate, margin: 0 },
  signOut: { width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.slate, fontSize: '14px', cursor: 'pointer' },
}
