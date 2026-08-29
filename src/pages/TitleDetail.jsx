import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import AddToListModal from '../components/AddToListModal'
import { theme } from '../theme'
import './TitleDetail.css'

const BADGE_DOT = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

export default function TitleDetail() {
  const { source, mediaType, externalId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [titleData, setTitleData] = useState(null)
  const [libraryEntry, setLibraryEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadTitleDetail()
    loadLibraryEntry()
  }, [source, mediaType, externalId])

  async function loadTitleDetail() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/title-detail?source=${source}&media_type=${mediaType}&id=${externalId}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load title')
      setTitleData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLibraryEntry() {
    if (!user) return
    const { data, error } = await supabase
      .from('watched_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', source)
      .eq('external_id', externalId)
      .eq('media_type', mediaType)
      .maybeSingle()
    if (!error && data) setLibraryEntry(data)
  }

  async function handleAddWatched(item) {
    if (!titleData) return
    const yearValue = Number(titleData.year)
    const insertData = {
      user_id: user.id,
      media_type: titleData.media_type,
      source: titleData.source,
      external_id: titleData.external_id,
      title: titleData.title,
      poster_url: titleData.poster_url || null,
      year: Number.isFinite(yearValue) ? yearValue : null,
      watched_date: new Date().toISOString().slice(0, 10),
      genres: titleData.genres?.length ? titleData.genres : null,
      director: titleData.director?.name || null,
      director_id: titleData.director?.id || null,
      cast_members: titleData.cast?.length ? titleData.cast.slice(0, 5).map((c) => c.name) : null,
      cast_ids:
        titleData.source === 'tmdb' && titleData.cast?.length
          ? titleData.cast.slice(0, 5).map((c) => c.id)
          : null,
      country: titleData.country || null,
      language: titleData.language || null,
    }
    if (titleData.source === 'tmdb' && titleData.media_type === 'movie') {
      insertData.collection_id = titleData.collection_id || null
      insertData.collection_name = titleData.collection_name || null
    }

    const { data, error } = await supabase
      .from('watched_entries')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('Insert error:', error)
      return
    }
    setLibraryEntry(data)
  }

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
    <div className="td-page" style={rootVars}>
      {titleData?.backdrop_url && (
        <>
          <div
            className="td-ambient-backdrop"
            style={{ backgroundImage: `url(${titleData.backdrop_url})` }}
          />
          <div className="td-ambient-overlay" />
        </>
      )}

      <div className="td-content">
        <button className="td-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {loading && <p className="td-status">Loading...</p>}
        {error && <p className="td-error">{error}</p>}

        {titleData && (
          <>
            <div className="td-header">
              {titleData.poster_url ? (
                <img src={titleData.poster_url} alt={titleData.title} className="td-poster" />
              ) : (
                <div className="td-poster-fallback">No image</div>
              )}
              <div className="td-header-info">
                <span className="td-badge">
                  <span
                    className="td-badge-dot"
                    style={{ backgroundColor: BADGE_DOT[titleData.media_type] || theme.colors.slate }}
                  />
                  {titleData.media_type}
                </span>
                <h1 className="td-title">{titleData.title}</h1>
                <p className="td-meta">
                  {titleData.year || '—'}
                  {titleData.runtime ? ` · ${titleData.runtime} min` : ''}
                  {titleData.episode_count ? ` · ${titleData.episode_count} episodes` : ''}
                </p>
                {titleData.genres?.length > 0 && (
                  <p className="td-genres">{titleData.genres.join(', ')}</p>
                )}

                {libraryEntry ? (
                  <div className="td-library-status">
                    <span className="td-watched-pill">Watched</span>
                    {libraryEntry.rating != null && (
                      <span className="td-rating">★ {libraryEntry.rating}/10</span>
                    )}
                    {libraryEntry.rewatched && <span className="td-rewatch-pill">Rewatched</span>}
                    <button className="td-edit-lists-btn" onClick={() => setShowAddModal(true)}>
                      Add to lists...
                    </button>
                  </div>
                ) : (
                  user && (
                    <button className="td-add-btn" onClick={() => setShowAddModal(true)}>
                      Add to...
                    </button>
                  )
                )}

                {libraryEntry?.notes && (
                  <p className="td-notes">{libraryEntry.notes}</p>
                )}
              </div>
            </div>

            <div className="sprocket-divider" />

            {titleData.overview && (
              <div className="td-section">
                <p className="td-section-label">Overview</p>
                <p className="td-overview">{titleData.overview}</p>
              </div>
            )}

            {titleData.collection_id && (
              <div className="td-section">
                <button
                  className="td-franchise-link"
                  onClick={() => navigate(`/franchise/${titleData.collection_id}`)}
                >
                  Part of {titleData.collection_name} →
                </button>
              </div>
            )}

            {titleData.director && (
              <div className="td-section">
                <p className="td-section-label">
                  {titleData.media_type === 'tv' || titleData.media_type === 'anime' ? 'Creator' : 'Director'}
                </p>
                <div
                  className="td-person-row"
                  style={titleData.director.id && titleData.source === 'tmdb' ? { cursor: 'pointer' } : undefined}
                  onClick={
                    titleData.director.id && titleData.source === 'tmdb'
                      ? () => navigate(`/person/${titleData.director.id}`)
                      : undefined
                  }
                >
                  {titleData.director.profile_url ? (
                    <img
                      src={titleData.director.profile_url}
                      alt={titleData.director.name}
                      className="td-person-photo"
                    />
                  ) : (
                    <div className="td-person-photo-fallback" />
                  )}
                  <span>{titleData.director.name}</span>
                </div>
              </div>
            )}

            {titleData.cast?.length > 0 && (
              <div className="td-section">
                <p className="td-section-label">Cast</p>
                <div className="td-cast-grid">
                  {titleData.cast.map((c, i) => (
                    <div
                      key={c.id ?? `${c.name}-${i}`}
                      className="td-cast-item"
                      style={c.id && titleData.source === 'tmdb' ? { cursor: 'pointer' } : undefined}
                      onClick={
                        c.id && titleData.source === 'tmdb'
                          ? () => navigate(`/person/${c.id}`)
                          : undefined
                      }
                    >
                      {c.profile_url ? (
                        <img src={c.profile_url} alt={c.name} className="td-person-photo" />
                      ) : (
                        <div className="td-person-photo-fallback" />
                      )}
                      <span className="td-cast-name">{c.name}</span>
                      {c.character && <span className="td-cast-character">{c.character}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && titleData && (
        <AddToListModal
          title={{
            source: titleData.source,
            media_type: titleData.media_type,
            external_id: titleData.external_id,
            title: titleData.title,
            poster_url: titleData.poster_url,
            year: titleData.year,
          }}
          added={!!libraryEntry}
          onAddWatched={(item) => {
            handleAddWatched(item)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
