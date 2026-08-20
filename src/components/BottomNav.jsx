import { Link, useLocation } from 'react-router-dom'
import { theme } from '../theme'

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.projectorAmber : theme.colors.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function SearchIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.projectorAmber : theme.colors.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.projectorAmber : theme.colors.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const TABS = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/search', label: 'Search', Icon: SearchIcon },
  { path: '/profile', label: 'Profile', Icon: ProfileIcon },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <div style={styles.bar}>
      {TABS.map(({ path, label, Icon }) => {
        const active = location.pathname === path
        return (
          <Link key={path} to={path} style={styles.tab}>
            <Icon active={active} />
            <span style={{ ...styles.label, color: active ? theme.colors.projectorAmber : theme.colors.slate }}>
              {label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

const styles = {
  bar: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', backgroundColor: 'rgba(22,23,28,0.92)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${theme.colors.cardBg}`, padding: '10px 0 14px 0', zIndex: 10 },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' },
  label: { fontSize: '11px', fontWeight: 600 },
}
