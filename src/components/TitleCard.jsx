import { theme } from '../theme'

const BADGE_COLORS = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

export function TitleCard({ item, added, onAdd }) {
  return (
    <div style={styles.card}>
      <div style={styles.posterWrap}>
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} style={styles.poster} />
        ) : (
          <div style={styles.posterFallback}>No image</div>
        )}
        <span
          style={{
            ...styles.badge,
            backgroundColor: BADGE_COLORS[item.media_type] || theme.colors.slate,
          }}
        >
          {item.media_type}
        </span>
      </div>
      <p style={styles.cardTitle}>{item.title}</p>
      <p style={styles.cardMeta}>{item.year || '—'}</p>
      <button
        onClick={() => onAdd(item)}
        disabled={added}
        style={added ? styles.addedButton : styles.addButton}
      >
        {added ? 'Added' : 'Add to watched'}
      </button>
    </div>
  )
}

const styles = {
  card: { backgroundColor: theme.colors.cardBg, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  posterWrap: { position: 'relative' },
  poster: { width: '100%', borderRadius: '6px', aspectRatio: '2/3', objectFit: 'cover', display: 'block' },
  posterFallback: { width: '100%', aspectRatio: '2/3', borderRadius: '6px', backgroundColor: theme.colors.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: theme.colors.screenGlow },
  badge: { position: 'absolute', top: '6px', left: '6px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', color: theme.colors.charcoal, textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardTitle: { fontSize: '13px', fontWeight: 600, margin: 0, lineHeight: 1.3 },
  cardMeta: { fontSize: '11px', color: theme.colors.slate, margin: 0 },
  addButton: { padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: theme.colors.projectorAmber, color: theme.colors.charcoal, fontWeight: 600, fontSize: '12px', cursor: 'pointer' },
  addedButton: { padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: theme.colors.slate, color: theme.colors.screenGlow, fontWeight: 600, fontSize: '12px', cursor: 'default' },
}
