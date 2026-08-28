import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './Lists.css'

export default function Lists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (user) loadLists()
  }, [user])

  async function loadLists() {
    setLoading(true)
    setError('')

    const { data: listsData, error: listsError } = await supabase
      .from('lists')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (listsError) {
      setError(listsError.message)
      setLoading(false)
      return
    }

    const listsWithCounts = await Promise.all(
      (listsData || []).map(async (list) => {
        const { count } = await supabase
          .from('list_items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', list.id)

        const { data: previewItems } = await supabase
          .from('list_items')
          .select('poster_path')
          .eq('list_id', list.id)
          .order('added_at', { ascending: false })
          .limit(4)

        return { ...list, itemCount: count || 0, previewPosters: (previewItems || []).map(i => i.poster_path) }
      })
    )

    setLists(listsWithCounts)
    setLoading(false)
  }

  async function createList() {
    const name = newListName.trim()
    if (!name) return

    setCreating(true)
    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: user.id, name })
      .select('id, name, description, created_at')
      .single()

    setCreating(false)

    if (error) {
      alert('Failed to create list: ' + error.message)
      return
    }

    setLists([{ ...data, itemCount: 0, previewPosters: [] }, ...lists])
    setNewListName('')
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
    <div className="lists-page" style={rootVars}>
      <div className="lists-content">
        <h1 className="lists-title">Lists</h1>
        <p className="lists-subtitle">{lists.length} list{lists.length === 1 ? '' : 's'}</p>

        <div className="sprocket-divider" />

        <div className="lists-create-row">
          <input
            type="text"
            placeholder="New list name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            className="lists-create-input"
          />
          <button
            onClick={createList}
            disabled={creating || !newListName.trim()}
            className="lists-create-button"
          >
            {creating ? '...' : 'Create'}
          </button>
        </div>

        {loading && <p className="lists-status">Loading...</p>}
        {error && <p className="lists-error">{error}</p>}
        {!loading && lists.length === 0 && (
          <p className="lists-status">No lists yet. Create one above to start curating.</p>
        )}

        <div className="lists-grid">
          {lists.map((list) => (
            <Link key={list.id} to={`/lists/${list.id}`} className="lists-card-link">
              <div className="lists-card">
                <div className="lists-card-posters">
                  {list.previewPosters.length > 0 ? (
                    list.previewPosters.map((p, i) => (
                      p ? <img key={i} src={p} alt="" className="lists-card-poster" /> : <div key={i} className="lists-card-poster-fallback" />
                    ))
                  ) : (
                    <div className="lists-card-poster-fallback" />
                  )}
                </div>
                <p className="lists-card-name">{list.name}</p>
                <p className="lists-card-count">{list.itemCount} title{list.itemCount === 1 ? '' : 's'}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
