import { useState } from 'react'
import { theme } from '../theme'
import AddToListModal from './AddToListModal'
import './TitleCard.css'

const BADGE_DOT = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

export function TitleCard({ item, added, onAdd }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="tc-card">
      <div className="tc-poster-wrap">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="tc-poster" />
        ) : (
          <div className="tc-poster-fallback">No image</div>
        )}
        <span className="tc-badge">
          <span className="tc-badge-dot" style={{ backgroundColor: BADGE_DOT[item.media_type] || theme.colors.slate }} />
          {item.media_type}
        </span>
      </div>
      <p className="tc-title">{item.title}</p>
      <p className="tc-meta">{item.year || '—'}</p>
      {item.upcoming ? (
        <div className="tc-upcoming">Not released yet</div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className={added ? 'tc-added-button' : 'tc-add-button'}
        >
          {added ? 'Added' : 'Add to...'}
        </button>
      )}
      {showModal && (
        <AddToListModal
          title={item}
          added={added}
          onAddWatched={onAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
