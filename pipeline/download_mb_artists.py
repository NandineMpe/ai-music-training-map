"""Download MusicBrainz artist data from the official data dump."""
import requests
import os

# The jbcurtin repo uses Git LFS, so we need a different source.
# Let's use the official MusicBrainz data dump directly.
# The 'artist' table has: id, name, sort_name, area (country area_id)
# Area IDs map to country codes via the 'area' and 'iso_3166_1' tables.

# Alternative: Use the MusicBrainz canonical data via their JSON API
# to batch-process. But a better shortcut is:
# The Hugging Face dataset "mtg-jamendo/mtg-jamendo-dataset" has artist countries,
# or we can use the simpler approach of querying in bulk.

# Best approach: Download the official MB dump's artist/area tables
# from https://data.metabrainz.org/pub/musicbrainz/data/fullexport/

# Let's check what's available
print("Checking MusicBrainz data dump availability...")
r = requests.get("https://data.metabrainz.org/pub/musicbrainz/data/fullexport/LATEST", timeout=10)
print(f"Latest dump: {r.text.strip()}")

latest = r.text.strip()
base_url = f"https://data.metabrainz.org/pub/musicbrainz/data/fullexport/{latest}"

# Check what files are available
print(f"\nChecking files at {base_url}...")
r2 = requests.get(base_url, timeout=10)
# Find the mbdump.tar.bz2 links
lines = [l for l in r2.text.split("\n") if "mbdump" in l.lower()]
for line in lines[:20]:
    print(f"  {line.strip()[:200]}")
