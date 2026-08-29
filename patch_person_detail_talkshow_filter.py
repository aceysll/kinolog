import sys

patches = [
    {
        "file": "api/person-detail.js",
        "old": """    const seen = new Map()
    const allCredits = [...(credits.cast || []), ...(credits.crew || [])]
    for (const c of allCredits) {
      if (c.media_type !== 'movie' && c.media_type !== 'tv') continue
      if (seen.has(c.id)) continue""",
        "new": """    // TMDB's popularity score for talk shows and news programs balloons from
    // decades of daily episodes and constant guest turnover, it isn't a signal
    // of how memorable the actual appearance was. Filter those genres out
    // before ranking, otherwise Top Works fills up with Tonight Show/Daily
    // Show credits instead of the person's actual films.
    const TALK_NEWS_GENRES = new Set([10767, 10763])

    const seen = new Map()
    const allCredits = [...(credits.cast || []), ...(credits.crew || [])]
    for (const c of allCredits) {
      if (c.media_type !== 'movie' && c.media_type !== 'tv') continue
      if (c.media_type === 'tv' && Array.isArray(c.genre_ids) && c.genre_ids.some((g) => TALK_NEWS_GENRES.has(g))) continue
      if (seen.has(c.id)) continue""",
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
