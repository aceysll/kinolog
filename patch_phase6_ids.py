import sys

patches = [
    {
        "file": "src/pages/Search.jsx",
        "old": """      const { genres, director, cast_members, country, language, collection_id, collection_name } = data
      await supabase
        .from('watched_entries')
        .update({
          genres,
          director,
          cast_members,
          country,
          language,
          collection_id,
          collection_name,
        })
        .eq('id', entryId)""",
        "new": """      const { genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name } = data
      await supabase
        .from('watched_entries')
        .update({
          genres,
          director,
          director_id,
          cast_members,
          cast_ids,
          country,
          language,
          collection_id,
          collection_name,
        })
        .eq('id', entryId)""",
    },
    {
        "file": "src/pages/Franchise.jsx",
        "old": """    const { genres, director, cast_members, country, language, collection_id, collection_name } = data
    await supabase
      .from('watched_entries')
      .update({ genres, director, cast_members, country, language, collection_id, collection_name })
      .eq('id', entryId)""",
        "new": """    const { genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name } = data
    await supabase
      .from('watched_entries')
      .update({ genres, director, director_id, cast_members, cast_ids, country, language, collection_id, collection_name })
      .eq('id', entryId)""",
    },
    {
        "file": "src/pages/Onboarding.jsx",
        "old": """      const { genres, director, cast_members, country, language } = data
      await supabase
        .from('watched_entries')
        .update({ genres, director, cast_members, country, language })
        .eq('id', entryId)""",
        "new": """      const { genres, director, director_id, cast_members, cast_ids, country, language } = data
      await supabase
        .from('watched_entries')
        .update({ genres, director, director_id, cast_members, cast_ids, country, language })
        .eq('id', entryId)""",
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
