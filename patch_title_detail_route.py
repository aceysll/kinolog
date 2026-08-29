import sys

patches = [
    {
        "file": "src/App.jsx",
        "old": "import Franchise from './pages/Franchise'",
        "new": "import Franchise from './pages/Franchise'\nimport TitleDetail from './pages/TitleDetail'",
    },
    {
        "file": "src/App.jsx",
        "old": """          <Route
            path="/franchise/:id"
            element={
              <ProtectedRoute>
                <Franchise />
              </ProtectedRoute>
            }
          />""",
        "new": """          <Route
            path="/franchise/:id"
            element={
              <ProtectedRoute>
                <Franchise />
              </ProtectedRoute>
            }
          />
          <Route
            path="/title/:source/:mediaType/:externalId"
            element={
              <ProtectedRoute>
                <TitleDetail />
              </ProtectedRoute>
            }
          />""",
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
