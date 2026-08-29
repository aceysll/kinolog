import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { theme } from '../theme'
import './PersonDetail.css'

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [person, setPerson] = useState(null)
  const [libraryEntries, setLibraryEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPerson()
    loadLibraryEntries()
  }, [id, user])

  async function loadPerson() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/person-detail?id=${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load person')
      setPerson(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLibraryEntries() {
    if (!user) return
    // A person can show up as director on one entry and cast on another,
    // so match either director_id or membership in the cast_ids array.
    const { data, error } = await supabase
      .from('watched_entries')
      .select('*')
      .eq('user_id', user.id)
      .or(`director_id.eq.${id},cast_ids.cs.{${id}}`)
    if (!error && data) setLibraryEntries(data)
  }

  const libraryExternalIds = new Set(libraryEntries.map((e) => `${e.source}-${e.external_id}`))
  const topWorks = (person?.filmography || [])
    .filter((f) => !libraryExternalIds.has(`${f.source}-${f.external_id}`))
    .slice(0, 10)

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
    <div className="pd-page" style={rootVars}>
      <div className="pd-content">
        <button className="pd-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {loading && <p className="pd-status">Loading...</p>}
        {error && <p className="pd-error">{error}</p>}

        {person && (
          <>
            <div className="pd-header">
              {person.profile_url ? (
                <img src={person.profile_url} alt={person.name} className="pd-photo" />
              ) : (
                <div className="pd-photo-fallback" />
              )}
              <div className="pd-header-info">
                <h1 className="pd-name">{person.name}</h1>
                {person.known_for_department && (
                  <p className="pd-department">{person.known_for_department}</p>
                )}
              </div>
            </div>

            {person.bio && (
              <div className="pd-section">
                <p className="pd-section-label">About</p>
                <p className="pd-bio">
                  {person.bio.length > 400 ? `${person.bio.slice(0, 400)}...` : person.bio}
                </p>
              </div>
            )}

            <div className="sprocket-divider" />

            <div className="pd-section">
              <p className="pd-section-label">In your library</p>
              {libraryEntries.length > 0 ? (
                <div className="pd-grid">
                  {libraryEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="pd-card"
                      onClick={() =>
                        navigate(`/title/${entry.source}/${entry.media_type}/${entry.external_id}`)
                      }
                    >
                      {entry.poster_url ? (
                        <img src={entry.poster_url} alt={entry.title} className="pd-card-poster" />
                      ) : (
                        <div className="pd-card-poster-fallback">No image</div>
                      )}
                      <p className="pd-card-title">{entry.title}</p>
                      {entry.rating != null && (
                        <p className="pd-card-rating">★ {entry.rating}/10</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pd-empty-note">
                  Nothing of theirs in your library yet.
                </p>
              )}
            </div>

            {topWorks.length > 0 && (
              <div className="pd-section">
                <p className="pd-section-label">Top works also by {person.name}</p>
                <div className="pd-grid">
                  {topWorks.map((work) => (
                    <div
                      key={`${work.source}-${work.external_id}`}
                      className="pd-card"
                      onClick={() =>
                        navigate(`/title/${work.source}/${work.media_type}/${work.external_id}`)
                      }
                    >
                      {work.poster_url ? (
                        <img src={work.poster_url} alt={work.title} className="pd-card-poster" />
                      ) : (
                        <div className="pd-card-poster-fallback">No image</div>
                      )}
                      <p className="pd-card-title">{work.title}</p>
                      <p className="pd-card-year">{work.year || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
