# Architecture

## What This Is

A browser-based tool for level designers to visualize player behavior on game maps. Upload parquet telemetry files, see player paths on minimaps, spot problem areas through heatmaps and event markers — replacing the fragmented workflow of cross-referencing PostHog and Map Stalker.

## Tech Stack & Why

| Technology | Why |
|-----------|-----|
| **Next.js 14 + TypeScript** | Static export (`output: 'export'`) means zero server cost — the entire app ships as HTML/JS/CSS. TypeScript catches data shape issues early, which matters when parsing raw telemetry. |
| **Hyparquet** | Parses parquet files directly in the browser. No backend needed to preprocess data — the designer just drops files and sees results. |
| **HTML5 Canvas (4 layers)** | Drawing hundreds of path segments and event markers per frame. Canvas handles this efficiently. Four stacked canvases (background, heatmap, paths, events) avoid redrawing layers that haven't changed. |
| **Zustand** | Lightweight state management. The app has many interconnected UI states (filters, playback, visibility toggles) — Zustand keeps this manageable without boilerplate. |
| **IndexedDB** | Persists uploaded data across browser sessions so designers don't re-upload files every time they open the tool. |
| **Tailwind CSS** | Fast UI iteration with a consistent dark theme suited for map visualization (high contrast paths on dark backgrounds). |

## Data Flow

```
Parquet Files → Hyparquet (decode) → Group by Match → Build Heatmaps → Zustand Store → Canvas Render
                                                                              ↓
                                                                         IndexedDB
```

1. **Upload** — Designer drops parquet files (or a folder). Files are read as ArrayBuffers in the browser.
2. **Parse** — Hyparquet decodes binary parquet into rows with columns: `user_id`, `match_id`, `map_id`, `x`, `z`, `ts`, `event`. Rows are grouped by match, players identified as human (UUID format) or bot.
3. **Aggregate** — Per-map heatmap grids (64x64) accumulate kill, death, traffic, and loot counts across all matches. Event counts are tallied per match.
4. **Store** — Parsed data goes into Zustand (in-memory) and IndexedDB (persistence). New uploads append to existing data.
5. **Render** — When a match is selected, MapCanvas draws the correct minimap background, then overlays player paths and event markers filtered by the current playback time. The usePlayback hook drives a requestAnimationFrame loop to animate the timeline.

## Coordinate Mapping

The parquet data contains game-engine world coordinates (x, z). The minimap is a 1024x1024 canvas. Mapping between them requires three values per map — **originX**, **originZ** (the world coordinate at the minimap's bottom-left corner) and **scale** (how many world units the minimap covers).

```
px = ((x - originX) / scale) * 1024
py = (1 - (z - originZ) / scale) * 1024    ← Y-flipped (game Z-up → canvas Y-down)
```

These values were calibrated per map by plotting known player positions against the minimap image and adjusting until paths aligned with visible roads, buildings, and terrain features.

| Map | Scale | Origin (X, Z) |
|-----|-------|---------------|
| AmbroseValley | 900 | (-370, -473) |
| GrandRift | 581 | (-290, -290) |
| Lockdown | 1000 | (-500, -500) |

## Assumptions on Ambiguous Data

- **No meaningful timestamps** — The `ts` field in the parquet data didn't provide useful time deltas between events. We generate synthetic timestamps based on distance between consecutive positions, assuming a player speed of ~20 world units/second, with a 500ms pause for action events (kills, loot, deaths). Playback timing is approximate but gives a realistic sense of flow.
- **Human vs Bot detection** — No explicit flag in the data. Players with UUID-formatted IDs are treated as humans; others as bots. This held consistently across the dataset but is an assumption.
- **Date extraction** — Dates come from folder names (e.g., `February_10/`), not from the data itself. If files aren't in dated folders, the date defaults to "unknown".

## Trade-offs

| Decision | Alternative | Why We Chose This |
|----------|-------------|-------------------|
| Fully client-side (no backend) | Server-side parsing + API | Zero infrastructure cost, easy to host as static site, but large datasets can strain the browser |
| Synthetic timestamps from distance | Use raw `ts` field | Raw timestamps lacked meaningful deltas; distance-based timing gives more natural playback |
| Canvas rendering | WebGL / SVG | Canvas is simpler and fast enough for current scale (~50 players/match); WebGL would be needed for hundreds |
| Append-only uploads | Replace on upload | Simpler mental model — upload more data to add it, clear all to start fresh. Trade-off: duplicate file uploads double heatmap counts |
| String-based date filtering | Parse dates into Date objects | Folder names like "February_10" sort consistently enough. Proper date parsing adds complexity for minimal gain with current data |
| No URL-encoded view state | Shareable URLs with filters/match/time | Would improve team collaboration (share exact view with Lead), but adds significant routing complexity |

## What I'd Do With More Time

- **Shareable view state via URL** — Encode selected match, filters, and timeline position in the URL so designers can share exact views with their Lead instead of screenshots.
- **Side-by-side map comparison** — Two maps/dates next to each other for A/B analysis (before/after a map fix), which is a core part of the designer's workflow.
- **Aggregate statistics panel** — Show kill/death ratios per area, average player survival time, common death causes — giving designers quantitative evidence to justify map changes.
- **WebGL rendering** — For handling larger datasets with more players and smoother zoom/pan at high detail levels.
