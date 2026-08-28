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
  const [showListModal, setShowListModal] = useState(false)

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
        <button
          className="tc-list-button"
          onClick={() => setShowListModal(true)}
          aria-label="Add to list"
        >
          +
        </button>
      </div>
      <p className="tc-title">{item.title}</p>
      <p className="tc-meta">{item.year || '—'}</p>
      {item.upcoming ? (
        <div className="tc-upcoming">Not released yet</div>
      ) : (
        <button
          onClick={() => onAdd(item)}
          disabled={added}
          className={added ? 'tc-added-button' : 'tc-add-button'}
        >
          {added ? 'Added' : 'Add to watched'}
        </button>
      )}
      {showListModal && (
        <AddToListModal title={item} onClose={() => setShowListModal(false)} />
      )}
    </div>
  )
}
