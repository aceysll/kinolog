import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Kinolog</h1>
        <p style={styles.subtitle}>Log in to your watched list</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p style={styles.footer}>
          No account? <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.charcoal, fontFamily: theme.fonts.body },
  card: { width: '100%', maxWidth: '360px', padding: '32px 28px', backgroundColor: theme.colors.cardBg, borderRadius: '12px' },
  title: { fontFamily: theme.fonts.display, fontSize: '32px', color: theme.colors.screenGlow, margin: '0 0 4px 0' },
  subtitle: { color: theme.colors.slate, fontSize: '14px', margin: '0 0 24px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.colors.slate}`, backgroundColor: 'transparent', color: theme.colors.screenGlow, fontSize: '15px' },
  button: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 600, fontSize: '15px', cursor: 'pointer', marginTop: '8px' },
  error: { color: theme.colors.velvetRed, fontSize: '13px', margin: 0 },
  footer: { marginTop: '20px', fontSize: '13px', color: theme.colors.slate, textAlign: 'center' },
  link: { color: theme.colors.projectorAmber, textDecoration: 'none' },
}
