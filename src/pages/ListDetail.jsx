import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './ListDetail.css'

const BADGE_DOT = {
  movie: theme.colors.projectorAmber,
  tv: theme.colors.velvetRed,
  anime: theme.colors.animeTeal,
}

export default function ListDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (user) loadList()
  }, [user, id])

  async function loadList() {
    setLoading(true)
    setError('')

    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, name, description, user_id')
      .eq('id', id)
      .single()

    if (listError || !listData || listData.user_id !== user.id) {
      setError('List not found.')
      setLoading(false)
      return
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', id)
      .order('added_at', { ascending: false })

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return
    }

    setList(listData)
    setNameInput(listData.name)
    setItems(itemsData || [])
    setLoading(false)
  }

  async function handleRemoveItem(itemId) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    const { error } = await supabase.from('list_items').delete().eq('id', itemId)
    if (error) alert('Failed to remove: ' + error.message)
  }

  async function handleRename() {
    const name = nameInput.trim()
    if (!name || name === list.name) {
      setRenaming(false)
      return
    }
    const { error } = await supabase.from('lists').update({ name }).eq('id', id)
    if (error) {
      alert('Failed to rename: ' + error.message)
      return
    }
    setList({ ...list, name })
    setRenaming(false)
  }

  async function handleDeleteList() {
    if (!confirm(`Delete "${list.name}"? This removes the list and all its items.`)) return
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) {
      alert('Failed to delete: ' + error.message)
      return
    }
    navigate('/lists')
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

  if (loading) {
    return (
      <div className="listdetail-page" style={rootVars}>
        <div className="listdetail-content">
          <p className="listdetail-status">Loading...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="listdetail-page" style={rootVars}>
        <div className="listdetail-content">
          <Link to="/lists" className="listdetail-back">← Back to Lists</Link>
          <p className="listdetail-error">{error}</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="listdetail-page" style={rootVars}>
      <div className="listdetail-content">
        <Link to="/lists" className="listdetail-back">← Back to Lists</Link>

        {renaming ? (
          <div className="listdetail-rename-row">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="listdetail-rename-input"
              autoFocus
            />
            <button onClick={handleRename} className="listdetail-rename-save">Save</button>
          </div>
        ) : (
          <h1 className="listdetail-title" onClick={() => setRenaming(true)}>{list.name}</h1>
        )}

        <p className="listdetail-subtitle">{items.length} title{items.length === 1 ? '' : 's'}</p>

        <div className="sprocket-divider" />

        <div className="listdetail-actions">
          <button onClick={() => setRenaming(true)} className="listdetail-action-btn">Rename</button>
          <button onClick={handleDeleteList} className="listdetail-action-btn danger">Delete list</button>
        </div>

        {items.length === 0 && (
          <p className="listdetail-status">Nothing here yet. Add titles from Search using the + button on any poster.</p>
        )}

        <div className="listdetail-grid">
          {items.map((item) => (
            <div key={item.id} className="listdetail-card">
              <div
                className="listdetail-poster-wrap"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/title/${item.source}/${item.media_type}/${item.external_id}`)}
              >
                {item.poster_path ? (
                  <img src={item.poster_path} alt={item.title} className="listdetail-poster" />
                ) : (
                  <div className="listdetail-poster-fallback">No image</div>
                )}
                <span className="listdetail-badge">
                  <span
                    className="listdetail-badge-dot"
                    style={{ backgroundColor: BADGE_DOT[item.media_type] || theme.colors.slate }}
                  />
                  {item.media_type}
                </span>
              </div>
              <p
                className="listdetail-card-title"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/title/${item.source}/${item.media_type}/${item.external_id}`)}
              >
                {item.title}
              </p>
              <p className="listdetail-card-year">{item.year || '—'}</p>
              <button onClick={() => handleRemoveItem(item.id)} className="listdetail-remove-btn">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
