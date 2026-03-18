import { parquetReadObjects } from 'hyparquet'
import type { MatchIndex, MatchData, MatchIndexEntry, HeatmapData } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EVENT_ABBREV: Record<string, string> = {
  Position: 'P',
  BotPosition: 'BP',
  Kill: 'K',
  Killed: 'D',
  BotKill: 'BK',
  BotKilled: 'BD',
  KilledByStorm: 'S',
  Loot: 'L',
}

const MAP_CFG: Record<string, { scale: number; originX: number; originZ: number }> = {
  AmbroseValley: { scale: 900, originX: -370, originZ: -473 },
  GrandRift: { scale: 581, originX: -290, originZ: -290 },
  Lockdown: { scale: 1000, originX: -500, originZ: -500 },
}

const GRID = 64

interface Row {
  user_id: string
  match_id: string
  map_id: string
  x: number
  z: number
  ts: number
  event: string
  date: string
}

function decodeEvent(evt: unknown): string {
  if (evt instanceof Uint8Array) return new TextDecoder().decode(evt)
  return String(evt ?? '')
}

function toMs(ts: unknown): number {
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'bigint') return Number(ts / BigInt(1000000))
  const n = Number(ts)
  if (n > 1e15) return n / 1e6
  if (n > 1e12) return n / 1e3
  return n
}

function worldToGrid(x: number, z: number, mapId: string): [number, number] {
  const c = MAP_CFG[mapId]
  if (!c) return [0, 0]
  const u = (x - c.originX) / c.scale
  const v = (z - c.originZ) / c.scale
  return [
    Math.max(0, Math.min(GRID - 1, Math.floor(u * GRID))),
    Math.max(0, Math.min(GRID - 1, Math.floor((1 - v) * GRID))),
  ]
}

function emptyGrid(): number[][] {
  return Array.from({ length: GRID }, () => new Array<number>(GRID).fill(0))
}

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
}

function extractDate(file: File): string {
  // Try to get date from folder name via webkitRelativePath
  // e.g. "February_10/somefile.nakama-0" or "player_data/February_10/somefile"
  const path = (file as { webkitRelativePath?: string }).webkitRelativePath || ''
  const parts = path.split('/')
  for (const part of parts) {
    const match = /^(January|February|March|April|May|June|July|August|September|October|November|December)_(\d+)$/i.exec(part)
    if (match) {
      const month = MONTH_MAP[match[1].toLowerCase()]
      const day = match[2].padStart(2, '0')
      return `2026-${month}-${day}`
    }
  }
  return 'Uploaded'
}

async function readFile(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer()
  const date = extractDate(file)
  const raw: Record<string, unknown>[] = await parquetReadObjects({ file: buf }) as Record<string, unknown>[]

  return raw.map((r) => ({
    user_id: String(r.user_id ?? ''),
    match_id: String(r.match_id ?? ''),
    map_id: String(r.map_id ?? ''),
    x: Number(r.x ?? 0),
    z: Number(r.z ?? 0),
    ts: toMs(r.ts),
    event: decodeEvent(r.event),
    date,
  }))
}

export async function parseParquetFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void,
  existingMatchIds?: Set<string>
): Promise<{
  matchIndex: MatchIndex
  matchDataMap: Record<string, MatchData>
  heatmapData: Record<string, HeatmapData>
}> {
  // 1. Read all files
  const allRows: Row[] = []
  for (let i = 0; i < files.length; i++) {
    const rows = await readFile(files[i])
    allRows.push(...rows)
    onProgress?.(i + 1, files.length)
  }

  // 2. Group by match
  const byMatch: Record<string, Row[]> = {}
  for (const row of allRows) {
    if (!byMatch[row.match_id]) byMatch[row.match_id] = []
    byMatch[row.match_id].push(row)
  }

  // 3. Build outputs
  const entries: MatchIndexEntry[] = []
  const matchDataMap: Record<string, MatchData> = {}
  const mapsSet: Record<string, boolean> = {}
  const datesSet: Record<string, boolean> = {}
  const humanIds: Record<string, boolean> = {}

  const heatGrids: Record<string, { kills: number[][]; deaths: number[][]; traffic: number[][]; loot: number[][]; storm: number[][] }> = {}

  for (const matchId of Object.keys(byMatch)) {
    if (existingMatchIds?.has(matchId)) continue
    const rows = byMatch[matchId]
    const mapId = rows[0].map_id
    const date = rows[0].date
    mapsSet[mapId] = true
    datesSet[date] = true

    // Init heatmap grids
    if (MAP_CFG[mapId] && !heatGrids[mapId]) {
      heatGrids[mapId] = { kills: emptyGrid(), deaths: emptyGrid(), traffic: emptyGrid(), loot: emptyGrid(), storm: emptyGrid() }
    }

    // Timestamps
    let tMin = Infinity
    let tMax = -Infinity
    for (const r of rows) {
      if (r.ts < tMin) tMin = r.ts
      if (r.ts > tMax) tMax = r.ts
    }

    // Group by player
    const byPlayer: Record<string, Row[]> = {}
    for (const row of rows) {
      if (!byPlayer[row.user_id]) byPlayer[row.user_id] = []
      byPlayer[row.user_id].push(row)
    }

    const eventCounts: Record<string, number> = {}
    const players: MatchData['players'] = []

    for (const userId of Object.keys(byPlayer)) {
      const pRows = byPlayer[userId]
      const human = UUID_RE.test(userId)
      if (human) humanIds[userId] = true

      pRows.sort((a: Row, b: Row) => a.ts - b.ts)

      // Build events with heatmap tracking
      const rawEvents: { x: number; z: number; e: string; event: string }[] = []
      for (const r of pRows) {
        const abbr = EVENT_ABBREV[r.event] ?? r.event
        eventCounts[abbr] = (eventCounts[abbr] ?? 0) + 1

        // Heatmap
        if (MAP_CFG[mapId] && heatGrids[mapId]) {
          const [gx, gy] = worldToGrid(r.x, r.z, mapId)
          if (r.event === 'Kill' || r.event === 'BotKill') heatGrids[mapId].kills[gy][gx]++
          if (r.event === 'Killed' || r.event === 'BotKilled' || r.event === 'KilledByStorm') heatGrids[mapId].deaths[gy][gx]++
          if (r.event === 'Position' || r.event === 'BotPosition') heatGrids[mapId].traffic[gy][gx]++
          if (r.event === 'Loot') heatGrids[mapId].loot[gy][gx]++
          if (r.event === 'KilledByStorm') heatGrids[mapId].storm[gy][gx]++
        }

        rawEvents.push({
          x: Math.round(r.x * 100) / 100,
          z: Math.round(r.z * 100) / 100,
          e: abbr,
          event: r.event,
        })
      }

      // Distance-based synthetic timestamps
      // Assume player moves at ~20 world units/second
      const ASSUMED_SPEED = 20
      const ACTION_PAUSE = 500 // ms pause for non-movement events
      const POSITION_EVENTS = new Set(['Position', 'BotPosition'])

      const syntheticTimes: number[] = [0]
      for (let i = 1; i < rawEvents.length; i++) {
        const prev = rawEvents[i - 1]
        const curr = rawEvents[i]
        const dx = curr.x - prev.x
        const dz = curr.z - prev.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        // Time in ms = (distance / speed) * 1000
        let dt = (dist / ASSUMED_SPEED) * 1000
        // Add a pause for action events (kills, loot, deaths, etc.)
        if (!POSITION_EVENTS.has(curr.event)) {
          dt += ACTION_PAUSE
        }
        syntheticTimes.push(syntheticTimes[i - 1] + dt)
      }

      const events = rawEvents.map((r, i) => ({
        t: Math.round(syntheticTimes[i]),
        x: r.x,
        z: r.z,
        e: r.e,
      }))

      players.push({ id: userId, human, events })
    }

    players.sort((a, b) => (a.human === b.human ? 0 : a.human ? -1 : 1))

    // Calculate match duration from synthetic timestamps
    let matchDuration = 0
    for (const p of players) {
      for (const ev of p.events) {
        if (ev.t > matchDuration) matchDuration = ev.t
      }
    }

    entries.push({
      id: matchId,
      map: mapId,
      date,
      humans: players.filter((p) => p.human).length,
      bots: players.filter((p) => !p.human).length,
      duration: matchDuration,
      events: eventCounts,
    })

    matchDataMap[matchId] = { id: matchId, map: mapId, date, players }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id))

  const matchIndex: MatchIndex = {
    matches: entries,
    stats: {
      totalMatches: entries.length,
      totalPlayers: Object.keys(humanIds).length,
      totalEvents: allRows.length,
      maps: Object.keys(mapsSet).sort(),
      dates: Object.keys(datesSet).sort(),
    },
  }

  const heatmapData: Record<string, HeatmapData> = {}
  for (const mapId of Object.keys(heatGrids)) {
    heatmapData[mapId] = { map: mapId, gridSize: GRID, ...heatGrids[mapId] }
  }

  return { matchIndex, matchDataMap, heatmapData }
}
