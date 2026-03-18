export interface MatchIndexEntry {
  id: string
  map: string
  date: string
  humans: number
  bots: number
  duration: number
  events: Record<string, number>
}

export interface MatchIndex {
  matches: MatchIndexEntry[]
  stats: {
    totalMatches: number
    totalPlayers: number
    totalEvents: number
    maps: string[]
    dates: string[]
  }
}

export interface PlayerEvent {
  t: number
  x: number
  z: number
  e: string
}

export interface Player {
  id: string
  human: boolean
  events: PlayerEvent[]
}

export interface MatchData {
  id: string
  map: string
  date: string
  players: Player[]
}

export interface HeatmapData {
  map: string
  gridSize: number
  kills: number[][]
  deaths: number[][]
  traffic: number[][]
  loot: number[][]
  storm: number[][]
}

export type HeatmapMode = 'off' | 'kills' | 'deaths' | 'traffic' | 'loot' | 'storm'
