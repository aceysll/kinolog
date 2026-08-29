import sys

patches = [
    {
        "file": "src/pages/TitleDetail.jsx",
        "old": """                {libraryEntry ? (
                  <div className="td-library-status">
                    <span className="td-watched-pill">Watched</span>
                    {libraryEntry.rating != null && (
                      <span className="td-rating">★ {libraryEntry.rating}/10</span>
                    )}
                    {libraryEntry.rewatched && <span className="td-rewatch-pill">Rewatched</span>}
                  </div>
                ) : (""",
        "new": """                {libraryEntry ? (
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
                ) : (""",
    },
    {
        "file": "src/pages/TitleDetail.css",
        "old": """.td-cast-character {
  font-size: 11px;
  color: var(--slate);
}""",
        "new": """.td-cast-character {
  font-size: 11px;
  color: var(--slate);
}

.td-edit-lists-btn {
  background: none;
  border: 1px solid var(--slate);
  color: #fff;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}""",
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
