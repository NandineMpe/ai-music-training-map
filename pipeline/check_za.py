import json
from pathlib import Path

za_file = Path(__file__).parent.parent / "web/public/data/artists_by_country/ZA.json"
if za_file.exists():
    d = json.load(open(za_file, "r", encoding="utf-8"))
    print(f"ZA: {d['artist_count']} artists, {d['track_count']} tracks")
    for a in d["artists"][:20]:
        print(f"  {a['name']}: {a['track_count']} tracks")
else:
    print("No ZA file")
