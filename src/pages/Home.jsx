import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>You're in.</h1>
      <p style={styles.text}>Logged in as {user?.email}</p>
      <button onClick={signOut} style={styles.button}>Log out</button>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body, color: theme.colors.screenGlow, gap: '12px' },
  title: { fontFamily: theme.fonts.display, fontSize: '40px', margin: 0 },
  text: { color: theme.colors.slate, margin: 0 },
  button: { marginTop: '16px', padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 600, cursor: 'pointer' },
}
