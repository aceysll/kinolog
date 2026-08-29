import sys

patches = [
    {
        "file": "src/App.jsx",
        "old": "import TitleDetail from './pages/TitleDetail'",
        "new": "import TitleDetail from './pages/TitleDetail'\nimport PersonDetail from './pages/PersonDetail'",
    },
    {
        "file": "src/App.jsx",
        "old": """          <Route
            path="/title/:source/:mediaType/:externalId"
            element={
              <ProtectedRoute>
                <TitleDetail />
              </ProtectedRoute>
            }
          />""",
        "new": """          <Route
            path="/title/:source/:mediaType/:externalId"
            element={
              <ProtectedRoute>
                <TitleDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/person/:id"
            element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            }
          />""",
    },
    {
        "file": "src/pages/TitleDetail.jsx",
        "old": """                <div className="td-person-row">
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
                </div>""",
        "new": """                <div
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
                </div>""",
    },
    {
        "file": "src/pages/TitleDetail.jsx",
        "old": """                  {titleData.cast.map((c, i) => (
                    <div key={c.id ?? `${c.name}-${i}`} className="td-cast-item">
                      {c.profile_url ? (
                        <img src={c.profile_url} alt={c.name} className="td-person-photo" />
                      ) : (
                        <div className="td-person-photo-fallback" />
                      )}
                      <span className="td-cast-name">{c.name}</span>
                      {c.character && <span className="td-cast-character">{c.character}</span>}
                    </div>
                  ))}""",
        "new": """                  {titleData.cast.map((c, i) => (
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
                  ))}""",
    },
]

failed = False
for p in patches:
    with open(p["file"], "r") as f:
        content = f.read()
    count = content.count(p["old"])
    if count != 1:
        print(f"SKIP {p['file']}: expected 1 match, found {count}")
        failed = True
        continue
    content = content.replace(p["old"], p["new"])
    with open(p["file"], "w") as f:
        f.write(content)
    print(f"OK {p['file']}")

if failed:
    sys.exit(1)
print("All patches applied.")
