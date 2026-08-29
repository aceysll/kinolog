import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import AddToListModal from '../components/AddToListModal'
import { theme } from '../theme'
import './Franchise.css'

// Fills genres/director/cast/country/language/collection info after a movie is
// inserted into watched_entries. Module-level so both the single "Add to..."
// flow and the bulk "Add all to Watched" flow can call the same logic.
async function fetchAndSaveTMDBDetails(entryId, tmdbId) {
  try {
    const res = await fetch(`/api/tmdb-details?media_type=movie&id=${tmdbId}`)
    if (!res.ok) throw new Error('TMDB detail fetch failed')
    const data = await res.json()
    const { genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name } = data
    await supabase
      .from('watched_entries')
      .update({ genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name })
      .eq('id', entryId)
  } catch (err) {
    console.error('TMDB detail fetch failed:', err)
  }
}

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
      fetchAndSaveTMDBDetails(data[0].id, item.external_id)
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
                  disabled={collection.parts.length === 0}
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
                        onClick={() => setAddItemTarget(part)}
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
          items={collection.parts}
          unwatchedItems={unwatchedParts}
          onClose={() => setShowAddAll(false)}
          onWatchedAdded={(addedItems) => {
            setWatchedKeys((prev) => {
              const next = new Set(prev)
              addedItems.forEach((item) => next.add(item.external_id))
              return next
            })
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}

// Phase 5: bulk list-picker, separate from AddToListModal by design since that
// component is built around a single title. This handles N items in one insert
// pass instead of extending the single-item modal to juggle arrays.
function AddAllToListModal({ items, unwatchedItems, onClose, onWatchedAdded }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [addedToWatched, setAddedToWatched] = useState(false)
  const [addingToWatched, setAddingToWatched] = useState(false)
  // Set of list ids where every item in this franchise is already a member.
  // Toggling a checked list off does a real bulk removal, toggling an
  // unchecked one on fills in only whichever items aren't already there.
  const [memberListIds, setMemberListIds] = useState(new Set())
  const [togglingListId, setTogglingListId] = useState(null)

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

    const { data: userLists, error: listsError } = await supabase
      .from('lists')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (listsError) {
      alert('Failed to load lists: ' + listsError.message)
      setLoading(false)
      return
    }

    const externalIds = items.map((i) => i.external_id)
    const { data: existingItems, error: itemsError } = await supabase
      .from('list_items')
      .select('list_id, external_id')
      .eq('source', 'tmdb')
      .in('external_id', externalIds)

    if (itemsError) {
      alert('Failed to load list membership: ' + itemsError.message)
    }

    // A list only counts as "member" if it already contains every item,
    // partial overlap is left unchecked since checking it would be misleading.
    const countByList = {}
    ;(existingItems || []).forEach((row) => {
      countByList[row.list_id] = (countByList[row.list_id] || 0) + 1
    })
    const fullMembers = new Set(
      Object.entries(countByList)
        .filter(([, count]) => count === items.length)
        .map(([listId]) => listId)
    )

    setLists(userLists || [])
    setMemberListIds(fullMembers)
    setLoading(false)
  }

  async function toggleList(list) {
    setTogglingListId(list.id)
    const isMember = memberListIds.has(list.id)

    if (isMember) {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', list.id)
        .eq('source', 'tmdb')
        .in('external_id', items.map((i) => i.external_id))

      setTogglingListId(null)
      if (error) {
        alert('Failed to remove from list: ' + error.message)
        return
      }
      const next = new Set(memberListIds)
      next.delete(list.id)
      setMemberListIds(next)
    } else {
      // Only insert items not already in this list, avoids duplicate rows
      // if membership was partial.
      const { data: existing } = await supabase
        .from('list_items')
        .select('external_id')
        .eq('list_id', list.id)
        .eq('source', 'tmdb')
        .in('external_id', items.map((i) => i.external_id))

      const existingIds = new Set((existing || []).map((r) => r.external_id))
      const toInsert = items.filter((i) => !existingIds.has(i.external_id))

      const rows = toInsert.map((item) => ({
        list_id: list.id,
        source: item.source,
        external_id: item.external_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_url || null,
        year: item.year || null,
      }))

      const { error } = rows.length > 0
        ? await supabase.from('list_items').insert(rows)
        : { error: null }

      setTogglingListId(null)
      if (error) {
        alert('Failed to add to list: ' + error.message)
        return
      }
      const next = new Set(memberListIds)
      next.add(list.id)
      setMemberListIds(next)
    }
  }

  async function addAllToWatched() {
    if (unwatchedItems.length === 0) return
    setAddingToWatched(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAddingToWatched(false)
      return
    }

    const rows = unwatchedItems.map((item) => {
      const yearValue = Number(item.year)
      return {
        user_id: user.id,
        media_type: 'movie',
        source: 'tmdb',
        external_id: item.external_id,
        title: item.title,
        poster_url: item.poster_url || null,
        year: Number.isFinite(yearValue) ? yearValue : null,
        watched_date: new Date().toISOString().slice(0, 10),
      }
    })

    const { data, error } = await supabase
      .from('watched_entries')
      .insert(rows)
      .select('id, external_id')

    setAddingToWatched(false)

    if (error) {
      alert('Failed to add titles: ' + error.message)
      return
    }

    setAddedToWatched(true)
    if (onWatchedAdded) onWatchedAdded(unwatchedItems)

    if (data) {
      data.forEach((row) => fetchAndSaveTMDBDetails(row.id, row.external_id))
    }
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
        ) : (
          <>
            <div className="atl-list-items">
              <label className="atl-list-row atl-watched-row">
                <input
                  type="checkbox"
                  checked={addedToWatched || unwatchedItems.length === 0}
                  disabled={addingToWatched || addedToWatched || unwatchedItems.length === 0}
                  onChange={addAllToWatched}
                />
                <span>
                  {addedToWatched || unwatchedItems.length === 0
                    ? 'All watched'
                    : `Add all to Watched (${unwatchedItems.length})`}
                </span>
              </label>

              <div className="atl-divider" />

              {lists.length === 0 && (
                <div className="atl-empty">No lists yet, create one below.</div>
              )}
              {lists.map((list) => (
                <label key={list.id} className="atl-list-row">
                  <input
                    type="checkbox"
                    checked={memberListIds.has(list.id)}
                    disabled={togglingListId === list.id}
                    onChange={() => toggleList(list)}
                  />
                  <span>{list.name}</span>
                </label>
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
