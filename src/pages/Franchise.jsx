import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import AddToListModal from '../components/AddToListModal'
import { theme } from '../theme'
import './Franchise.css'

export default function Franchise() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchedKeys, setWatchedKeys] = useState(new Set())
  const [showAddAll, setShowAddAll] = useState(false)
  const [addItemTarget, setAddItemTarget] = useState(null)

  useEffect(() => {
    loadCollection()
    loadWatched()
  }, [id])

  async function loadCollection() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/collection?id=${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load franchise')
      setCollection(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadWatched() {
    if (!user) return
    const { data, error } = await supabase
      .from('watched_entries')
      .select('source, external_id')
      .eq('user_id', user.id)
      .eq('source', 'tmdb')
    if (!error && data) {
      setWatchedKeys(new Set(data.map((row) => row.external_id)))
    }
  }

  // Fills genres/director/cast/country/language after insert, same pattern as
  // Search.jsx. collection_id/collection_name are already known here since
  // we're on that exact franchise's page, but the shared endpoint returns
  // them too, so this stays consistent with how every other add flow works.
  async function fetchTMDBDetails(entryId, tmdbId) {
    try {
      const res = await fetch(`/api/tmdb-details?media_type=movie&id=${tmdbId}`)
      if (!res.ok) throw new Error('TMDB detail fetch failed')
      const data = await res.json()
      const { genres, director, cast_members, country, language, collection_id, collection_name } = data
      await supabase
        .from('watched_entries')
        .update({ genres, director, cast_members, country, language, collection_id, collection_name })
        .eq('id', entryId)
    } catch (err) {
      console.error('TMDB detail fetch failed:', err)
    }
  }

  async function handleAddWatched(item) {
    const yearValue = Number(item.year)
    const insertData = {
      user_id: user.id,
      media_type: 'movie',
      source: 'tmdb',
      external_id: item.external_id,
      title: item.title,
      poster_url: item.poster_url || null,
      year: Number.isFinite(yearValue) ? yearValue : null,
      watched_date: new Date().toISOString().slice(0, 10),
    }

    const { data, error } = await supabase
      .from('watched_entries')
      .insert(insertData)
      .select('id')

    if (error) {
      console.error('Insert error:', error)
      return
    }

    setWatchedKeys((prev) => new Set(prev).add(item.external_id))

    if (data && data.length > 0) {
      fetchTMDBDetails(data[0].id, item.external_id)
    }
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

  const unwatchedParts = (collection?.parts || []).filter(
    (p) => !watchedKeys.has(p.external_id)
  )

  return (
    <div className="franchise-page" style={rootVars}>
      {collection?.backdrop_url && (
        <>
          <div
            className="franchise-ambient-backdrop"
            style={{ backgroundImage: `url(${collection.backdrop_url})` }}
          />
          <div className="franchise-ambient-overlay" />
        </>
      )}

      <div className="franchise-content">
        <button className="franchise-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {loading && <p className="franchise-status">Loading...</p>}
        {error && <p className="franchise-error">{error}</p>}

        {collection && (
          <>
            <p className="franchise-eyebrow">Franchise</p>
            <h1 className="franchise-title">{collection.name}</h1>
            {collection.overview && (
              <p className="franchise-overview">{collection.overview}</p>
            )}

            <div className="sprocket-divider" />

            <div className="franchise-actions">
              <p className="franchise-count">
                {collection.parts.length} title{collection.parts.length === 1 ? '' : 's'}
                {watchedKeys.size > 0 &&
                  ` · ${collection.parts.length - unwatchedParts.length} watched`}
              </p>
              {user && (
                <button
                  className="franchise-add-all-btn"
                  onClick={() => setShowAddAll(true)}
                  disabled={unwatchedParts.length === 0}
                >
                  Add all to...
                </button>
              )}
            </div>

            <div className="franchise-grid">
              {collection.parts.map((part) => {
                const isWatched = watchedKeys.has(part.external_id)
                return (
                  <div key={part.external_id} className="franchise-card">
                    <div className="franchise-poster-wrap">
                      {part.poster_url ? (
                        <img
                          src={part.poster_url}
                          alt={part.title}
                          className="franchise-poster"
                        />
                      ) : (
                        <div className="franchise-poster-fallback">No image</div>
                      )}
                      {isWatched && <span className="franchise-watched-badge">Watched</span>}
                      {part.upcoming && !isWatched && (
                        <span className="franchise-upcoming-badge">Not released</span>
                      )}
                    </div>
                    <p className="franchise-card-title">{part.title}</p>
                    <p className="franchise-card-year">{part.year || '—'}</p>
                    {user && !part.upcoming && (
                      <button
                        className={isWatched ? 'franchise-added-btn' : 'franchise-add-btn'}
                        onClick={() => !isWatched && setAddItemTarget(part)}
                        disabled={isWatched}
                      >
                        {isWatched ? 'Added' : 'Add to...'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {addItemTarget && (
        <AddToListModal
          title={{ ...addItemTarget, source: 'tmdb', media_type: 'movie' }}
          added={watchedKeys.has(addItemTarget.external_id)}
          onAddWatched={(item) => {
            handleAddWatched(item)
            setAddItemTarget(null)
          }}
          onClose={() => setAddItemTarget(null)}
        />
      )}

      {showAddAll && collection && (
        <AddAllToListModal
          items={unwatchedParts}
          onClose={() => setShowAddAll(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

// Phase 5: bulk list-picker, separate from AddToListModal by design since that
// component is built around a single title. This handles N items in one insert
// pass instead of extending the single-item modal to juggle arrays.
function AddAllToListModal({ items, onClose }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addedToListId, setAddedToListId] = useState(null)

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('lists')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setLists(data || [])
    setLoading(false)
  }

  async function addAllToList(listId) {
    setAdding(true)
    const rows = items.map((item) => ({
      list_id: listId,
      source: item.source,
      external_id: item.external_id,
      media_type: item.media_type,
      title: item.title,
      poster_path: item.poster_url || null,
      year: item.year || null,
    }))

    const { error } = await supabase.from('list_items').insert(rows)
    setAdding(false)

    if (error) {
      alert('Failed to add titles: ' + error.message)
      return
    }
    setAddedToListId(listId)
  }

  async function createList() {
    const name = newListName.trim()
    if (!name) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCreating(false)
      return
    }
    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: user.id, name })
      .select('id, name')
      .single()
    setCreating(false)
    if (error) {
      alert('Failed to create list: ' + error.message)
      return
    }
    setLists([data, ...lists])
    setNewListName('')
  }

  return (
    <div className="atl-overlay" onClick={onClose}>
      <div className="atl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="atl-header">
          <span className="atl-title">Add {items.length} title{items.length === 1 ? '' : 's'} to</span>
          <button className="atl-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="atl-loading">Loading...</div>
        ) : addedToListId ? (
          <div className="atl-loading">Added.</div>
        ) : (
          <>
            <div className="atl-list-items">
              {lists.length === 0 && (
                <div className="atl-empty">No lists yet, create one below.</div>
              )}
              {lists.map((list) => (
                <button
                  key={list.id}
                  className="atl-list-row"
                  onClick={() => addAllToList(list.id)}
                  disabled={adding}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span>{list.name}</span>
                </button>
              ))}
            </div>

            <div className="atl-create">
              <input
                type="text"
                placeholder="New list name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
              />
              <button onClick={createList} disabled={creating || !newListName.trim()}>
                {creating ? '...' : 'Create'}
              </button>
            </div>

            <button className="atl-done-button" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  )
}
