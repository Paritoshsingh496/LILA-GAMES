# Architecture

## What This Is

A browser-based visualization tool built for level designers. It provides a visual representation of how players and bots interact with the game environment, helping designers analyse player behavior, identify problem areas, and make informed decisions to improve map design.

## Tech Stack & Why

| Technology | Why |
|-----------|-----|
| **Next.js 14 + TypeScript** | Static export (`output: 'export'`) means zero server cost. The entire app ships as HTML/JS/CSS. TypeScript ensures the telemetry data is correctly structured as it flows through the app. |
| **Hyparquet** | Parses parquet files directly in the browser. No backend needed to preprocess data, the designer just drops files and sees results. |
| **HTML5 Canvas (4 layers)** | The map view uses four canvases stacked on top of each other: background, heatmap, paths, and events. Each layer only redraws when its data changes, keeping rendering fast during playback. |
| **Zustand** | Lightweight state management. The app has many interconnected UI states (filters, playback, visibility toggles), Zustand keeps this manageable without boilerplate. |
| **IndexedDB** | Persists uploaded data across browser sessions so designers don't re-upload files every time they open the tool. |
| **Tailwind CSS** | Fast UI iteration with a consistent dark theme suited for map visualization (high contrast paths on dark backgrounds). |

## Data Flow

```
Parquet Files → Hyparquet (decode) → Group by Match → Build Heatmaps → Zustand Store → Canvas Render
                                                                              ↓
                                                                         IndexedDB
```

1. **Upload** : The designer drops parquet files or a folder into the app.
2. **Parse** : Hyparquet decodes the files into rows containing player positions, events, match IDs, and map IDs.
3. **Aggregate** : Events are grouped by match. Heatmap grids (64x64) are built per map, accumulating kills, deaths, traffic, and loot across all matches.
4. **Store** : Parsed data is stored in Zustand (in memory) and IndexedDB (persisted locally). New uploads are appended to existing data.
5. **Render** : When a match is selected, the canvas draws the minimap, overlays player paths, and places event markers. A playback loop animates the timeline so events appear over time.

## Coordinate Mapping

The parquet data contains game-engine world coordinates (x, y, z). Coordinates (x, z) from the parquet data have been used to plot the minimap. The canvas of the minimap is 1024x1024 pixels. Mapping the world coordinates onto this canvas requires three values per map: **originX** and **originZ** (the world coordinate at the minimap's bottom-left corner), and **scale** (how many world units the minimap covers, which determines how much of the game world fits within the canvas).

```
px = ((x - originX) / scale) * 1024
py = (1 - (z - originZ) / scale) * 1024    ← Y is flipped (image origin is top-left)
```

These values, including the conversion formula and the Y-flip, were provided in the dataset README for each map.

| Map | Scale | Origin (X, Z) |
|-----|-------|---------------|
| AmbroseValley | 900 | (-370, -473) |
| GrandRift | 581 | (-290, -290) |
| Lockdown | 1000 | (-500, -500) |

## Assumptions on Ambiguous Data

- **No meaningful timestamps** — The `ts` field in the parquet data didn't provide useful time deltas between events. We generate synthetic timestamps based on distance between consecutive positions, assuming a player speed of ~20 world units/second, with a 500ms pause for action events (kills, loot, deaths). Playback timing is approximate but gives a realistic sense of flow.
- **Date extraction** — Dates are extracted from folder names (e.g., `February_10/`), not from the parquet data itself. The date filtering feature depends on this folder structure. If files are uploaded without dated folders, the date defaults to "unknown" and date range filtering won't apply to those matches.

## Trade-offs

| Decision | Alternative | Why We Chose This |
|----------|-------------|-------------------|
| Fully client-side (no backend) | Server-side parsing + API | No server needed and easy to deploy anywhere, but the browser handles all the processing so very large datasets may slow down |
| Synthetic timestamps from distance | Use raw `ts` field | Multiple events in the data share the same or nearly identical timestamps, so using them directly would make all events appear at once. Distance-based timing spaces them out for smoother playback, but does not reflect actual match duration |
| Canvas rendering | WebGL / SVG | Canvas is simpler and fast enough for current scale (~50 players/match); WebGL would be needed for hundreds |
| No URL-encoded view state | Shareable URLs with filters/match/time | Keeps the app simple without routing complexity, but team members cannot share a direct link to a specific view and have to navigate to it manually |

## What I'd Do With More Time

| Technical Changes | Feature Enhancements | Product Direction |
|-------------------|---------------------|-------------------|
| Shareable view state via URL, so designers can share exact views with their Lead instead of screenshots | Selection of multiple matches, so level designers can view and compare events across different matches simultaneously | Conduct user testing sessions with level designers to get approval for the tool and identify further points of friction in their workflow |
| Side-by-side map comparison for A/B analysis before and after a map fix | Heatmap filter for bots and players, so designers can separate bot activity from human activity on heatmaps for more accurate analysis | Add analytics to observe how level designers interact with the tool, identify which features are used most, and use that data to guide future improvements |
| WebGL rendering to handle larger datasets with more players and smoother zoom/pan at high detail levels | | |
