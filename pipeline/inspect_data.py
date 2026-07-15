"""Quick inspect of the LAION-DISCO-12M data format."""
from datasets import load_dataset

ds = load_dataset("laion/LAION-DISCO-12M", split="train")

print("=== First 5 rows ===")
for i in range(5):
    row = ds[i]
    an = row["artist_names"]
    print(f"\nRow {i}:")
    print(f"  artist_names type: {type(an)}")
    print(f"  artist_names value: {repr(an)}")
    print(f"  song_id: {row['song_id']}")
    print(f"  title: {row['title']}")

print("\n=== Dataset features ===")
print(ds.features)
