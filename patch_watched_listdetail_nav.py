import sys

patches = [
    {
        "file": "src/pages/Watched.jsx",
        "old": """              <div className="watched-poster-wrap">
                {entry.poster_url ? (
                  <img src={entry.poster_url} alt={entry.title} className="watched-poster" />
                ) : (
                  <div className="watched-poster-fallback">No image</div>
                )}
                <span className="watched-badge">
                  <span
                    className="watched-badge-dot"
                    style={{ backgroundColor: BADGE_DOT[entry.media_type] || theme.colors.slate }}
                  />
                  {entry.media_type}
                </span>
              </div>

              <div className="watched-row-info">
                <p className="watched-row-title">{entry.title}</p>""",
        "new": """              <div
                className="watched-poster-wrap"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/title/${entry.source}/${entry.media_type}/${entry.external_id}`)}
              >
                {entry.poster_url ? (
                  <img src={entry.poster_url} alt={entry.title} className="watched-poster" />
                ) : (
                  <div className="watched-poster-fallback">No image</div>
                )}
                <span className="watched-badge">
                  <span
                    className="watched-badge-dot"
                    style={{ backgroundColor: BADGE_DOT[entry.media_type] || theme.colors.slate }}
                  />
                  {entry.media_type}
                </span>
              </div>

              <div className="watched-row-info">
                <p
                  className="watched-row-title"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/title/${entry.source}/${entry.media_type}/${entry.external_id}`)}
                >
                  {entry.title}
                </p>""",
    },
    {
        "file": "src/pages/ListDetail.jsx",
        "old": """              <div className="listdetail-poster-wrap">
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
              <p className="listdetail-card-title">{item.title}</p>""",
        "new": """              <div
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
              </p>""",
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
