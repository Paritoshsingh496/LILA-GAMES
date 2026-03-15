"""
Preprocessing script: Converts raw parquet telemetry files into browser-ready JSON.

Reads 1,243 parquet files from player_data/ and outputs:
  - public/data/index.json        (match index with metadata)
  - public/data/matches/{id}.json (per-match player events)
  - public/data/heatmaps/{map}.json (pre-aggregated heatmap grids)
"""

import os
import sys
import json
import re
import numpy as np
import pyarrow.parquet as pq
import pandas as pd
from collections import defaultdict

# --- Configuration ---
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__),
    "../../DATA/player_data/player_data"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__),
    "../public/data"))
DATE_FOLDERS = ["February_10", "February_11", "February_12", "February_13", "February_14"]

# Event abbreviations to reduce JSON size
EVENT_ABBREV = {
    "Position": "P",
    "BotPosition": "BP",
    "Kill": "K",
    "Killed": "D",
    "BotKill": "BK",
    "BotKilled": "BD",
    "KilledByStorm": "S",
    "Loot": "L",
}

# Map configs for heatmap grid coordinate conversion
MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "originX": -370, "originZ": -473},
    "GrandRift": {"scale": 581, "originX": -290, "originZ": -290},
    "Lockdown": {"scale": 1000, "originX": -500, "originZ": -500},
}

HEATMAP_GRID_SIZE = 64

UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE
)

def is_human(user_id: str) -> bool:
    return bool(UUID_PATTERN.match(user_id))

def decode_event(evt) -> str:
    if isinstance(evt, bytes):
        return evt.decode('utf-8')
    return str(evt)

def world_to_grid(x, z, map_id, grid_size=HEATMAP_GRID_SIZE):
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["originX"]) / cfg["scale"]
    v = (z - cfg["originZ"]) / cfg["scale"]
    gx = int(u * grid_size)
    gy = int((1 - v) * grid_size)
    gx = max(0, min(grid_size - 1, gx))
    gy = max(0, min(grid_size - 1, gy))
    return gx, gy

def load_all_data():
    """Load all parquet files into a single DataFrame."""
    all_frames = []
    total_files = 0

    for date_folder in DATE_FOLDERS:
        folder_path = os.path.join(DATA_DIR, date_folder)
        if not os.path.exists(folder_path):
            print(f"  Warning: {folder_path} not found, skipping")
            continue

        files = [f for f in os.listdir(folder_path) if not f.startswith('.')]
        print(f"  Reading {date_folder}: {len(files)} files...")

        for fname in files:
            filepath = os.path.join(folder_path, fname)
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()
                df['_date'] = date_folder
                all_frames.append(df)
                total_files += 1
            except Exception as e:
                print(f"    Error reading {fname}: {e}")
                continue

    print(f"  Loaded {total_files} files total")
    df = pd.concat(all_frames, ignore_index=True)

    # Decode event column
    df['event'] = df['event'].apply(decode_event)

    # Detect human vs bot
    df['is_human'] = df['user_id'].apply(is_human)

    # Convert timestamp to milliseconds (integer) for compact JSON
    # ts is match-relative time stored as datetime, convert to ms from epoch
    df['t'] = df['ts'].astype(np.int64) // 1_000_000  # ns to ms

    # Clean match_id (remove .nakama-0 suffix for cleaner IDs)
    df['match_id_clean'] = df['match_id'].str.replace('.nakama-0', '', regex=False)

    return df

def generate_index(df):
    """Generate index.json with match metadata."""
    print("Generating index.json...")

    matches = []
    grouped = df.groupby('match_id_clean')

    for match_id, mdf in grouped:
        # Get event counts
        event_counts = mdf['event'].value_counts().to_dict()

        # Count humans and bots
        players = mdf.groupby('user_id').first()
        human_count = int(players['is_human'].sum())
        bot_count = int((~players['is_human']).sum())

        # Duration
        t_min = mdf['t'].min()
        t_max = mdf['t'].max()
        duration_ms = int(t_max - t_min)

        matches.append({
            "id": match_id,
            "map": mdf['map_id'].iloc[0],
            "date": mdf['_date'].iloc[0],
            "humans": human_count,
            "bots": bot_count,
            "duration": duration_ms,
            "events": {EVENT_ABBREV.get(k, k): int(v) for k, v in event_counts.items()},
        })

    # Sort by date then match_id
    matches.sort(key=lambda m: (m['date'], m['id']))

    # Stats
    stats = {
        "totalMatches": len(matches),
        "totalPlayers": int(df[df['is_human']]['user_id'].nunique()),
        "totalEvents": len(df),
        "maps": sorted(df['map_id'].unique().tolist()),
        "dates": DATE_FOLDERS,
    }

    index = {"matches": matches, "stats": stats}

    outpath = os.path.join(OUTPUT_DIR, "index.json")
    with open(outpath, 'w') as f:
        json.dump(index, f, separators=(',', ':'))

    size_kb = os.path.getsize(outpath) / 1024
    print(f"  index.json: {size_kb:.1f} KB, {len(matches)} matches")
    return index

def generate_match_files(df):
    """Generate per-match JSON files."""
    print("Generating match files...")

    os.makedirs(os.path.join(OUTPUT_DIR, "matches"), exist_ok=True)
    grouped = df.groupby('match_id_clean')
    total_size = 0

    for match_id, mdf in grouped:
        players = []
        for user_id, pdf in mdf.groupby('user_id'):
            pdf_sorted = pdf.sort_values('t')

            # Normalize timestamps: subtract min time so match starts at 0
            t_min = mdf['t'].min()

            events = []
            for _, row in pdf_sorted.iterrows():
                events.append({
                    "t": int(row['t'] - t_min),
                    "x": round(float(row['x']), 2),
                    "z": round(float(row['z']), 2),
                    "e": EVENT_ABBREV.get(row['event'], row['event']),
                })

            players.append({
                "id": user_id,
                "human": bool(row['is_human']),
                "events": events,
            })

        # Sort: humans first, then bots
        players.sort(key=lambda p: (not p['human'], p['id']))

        match_data = {
            "id": match_id,
            "map": mdf['map_id'].iloc[0],
            "date": mdf['_date'].iloc[0],
            "players": players,
        }

        outpath = os.path.join(OUTPUT_DIR, "matches", f"{match_id}.json")
        with open(outpath, 'w') as f:
            json.dump(match_data, f, separators=(',', ':'))

        total_size += os.path.getsize(outpath)

    print(f"  {len(grouped)} match files, total: {total_size / 1024 / 1024:.2f} MB")

def generate_heatmaps(df):
    """Generate pre-aggregated heatmap grids per map."""
    print("Generating heatmap files...")

    os.makedirs(os.path.join(OUTPUT_DIR, "heatmaps"), exist_ok=True)

    for map_id in MAP_CONFIG:
        mdf = df[df['map_id'] == map_id]

        if len(mdf) == 0:
            print(f"  No data for {map_id}, skipping")
            continue

        # Kill heatmap (where kills happen)
        kills_grid = np.zeros((HEATMAP_GRID_SIZE, HEATMAP_GRID_SIZE), dtype=int)
        kill_events = mdf[mdf['event'].isin(['Kill', 'BotKill'])]
        for _, row in kill_events.iterrows():
            gx, gy = world_to_grid(row['x'], row['z'], map_id)
            kills_grid[gy][gx] += 1

        # Death heatmap (where deaths happen)
        deaths_grid = np.zeros((HEATMAP_GRID_SIZE, HEATMAP_GRID_SIZE), dtype=int)
        death_events = mdf[mdf['event'].isin(['Killed', 'BotKilled', 'KilledByStorm'])]
        for _, row in death_events.iterrows():
            gx, gy = world_to_grid(row['x'], row['z'], map_id)
            deaths_grid[gy][gx] += 1

        # Traffic heatmap (where players move)
        traffic_grid = np.zeros((HEATMAP_GRID_SIZE, HEATMAP_GRID_SIZE), dtype=int)
        pos_events = mdf[mdf['event'].isin(['Position', 'BotPosition'])]
        for _, row in pos_events.iterrows():
            gx, gy = world_to_grid(row['x'], row['z'], map_id)
            traffic_grid[gy][gx] += 1

        # Loot heatmap
        loot_grid = np.zeros((HEATMAP_GRID_SIZE, HEATMAP_GRID_SIZE), dtype=int)
        loot_events = mdf[mdf['event'] == 'Loot']
        for _, row in loot_events.iterrows():
            gx, gy = world_to_grid(row['x'], row['z'], map_id)
            loot_grid[gy][gx] += 1

        heatmap_data = {
            "map": map_id,
            "gridSize": HEATMAP_GRID_SIZE,
            "kills": kills_grid.tolist(),
            "deaths": deaths_grid.tolist(),
            "traffic": traffic_grid.tolist(),
            "loot": loot_grid.tolist(),
        }

        outpath = os.path.join(OUTPUT_DIR, "heatmaps", f"{map_id}.json")
        with open(outpath, 'w') as f:
            json.dump(heatmap_data, f, separators=(',', ':'))

        size_kb = os.path.getsize(outpath) / 1024
        print(f"  {map_id}: {size_kb:.1f} KB "
              f"(kills={int(kills_grid.sum())}, deaths={int(deaths_grid.sum())}, "
              f"traffic={int(traffic_grid.sum())}, loot={int(loot_grid.sum())})")

def main():
    print("=" * 60)
    print("LILA BLACK - Data Preprocessing")
    print("=" * 60)

    print(f"\nData source: {DATA_DIR}")
    print(f"Output dir:  {OUTPUT_DIR}\n")

    # Step 1: Load all data
    print("[1/4] Loading parquet files...")
    df = load_all_data()
    print(f"  Total rows: {len(df)}")
    print(f"  Events: {df['event'].value_counts().to_dict()}")
    print(f"  Maps: {df['map_id'].value_counts().to_dict()}")
    print(f"  Humans: {df[df['is_human']]['user_id'].nunique()}, "
          f"Bots: {df[~df['is_human']]['user_id'].nunique()}")

    # Step 2: Generate index
    print("\n[2/4] Generating index...")
    generate_index(df)

    # Step 3: Generate match files
    print("\n[3/4] Generating match files...")
    generate_match_files(df)

    # Step 4: Generate heatmaps
    print("\n[4/4] Generating heatmaps...")
    generate_heatmaps(df)

    print("\n" + "=" * 60)
    print("Done! Output written to:", OUTPUT_DIR)
    print("=" * 60)

if __name__ == "__main__":
    main()
