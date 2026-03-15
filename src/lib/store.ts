import { create } from 'zustand'
import type { MatchIndex, MatchData, HeatmapData, HeatmapMode } from './types'
import { clearStoredData } from './storage'

interface AppState {
  // Data
  matchIndex: MatchIndex | null
  matchDataMap: Record<string, MatchData>
  currentMatch: MatchData | null
  heatmapData: Record<string, HeatmapData>
  loading: boolean
  uploading: boolean

  // Filters
  selectedMap: string
  selectedDate: string
  searchQuery: string

  // Match selection
  selectedMatchId: string | null

  // Player visibility
  visiblePlayerIds: Set<string>
  showBots: boolean

  // Timeline
  currentTime: number
  maxTime: number
  isPlaying: boolean
  playbackSpeed: number

  // Upload modal
  showUploadModal: boolean

  // Heatmap
  heatmapMode: HeatmapMode

  // Actions
  setMatchIndex: (index: MatchIndex) => void
  setMatchDataMap: (map: Record<string, MatchData>) => void
  setCurrentMatch: (match: MatchData | null) => void
  setHeatmapData: (mapId: string, data: HeatmapData) => void
  setAllHeatmapData: (data: Record<string, HeatmapData>) => void
  setLoading: (loading: boolean) => void
  setUploading: (uploading: boolean) => void
  setSelectedMap: (map: string) => void
  setSelectedDate: (date: string) => void
  setSearchQuery: (query: string) => void
  setSelectedMatchId: (id: string | null) => void
  selectMatch: (id: string) => void
  togglePlayerVisibility: (playerId: string) => void
  setAllPlayersVisible: (playerIds: string[]) => void
  setShowBots: (show: boolean) => void
  setCurrentTime: (time: number) => void
  setMaxTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setShowUploadModal: (show: boolean) => void
  setHeatmapMode: (mode: HeatmapMode) => void
  clearData: () => void
}

export const useStore = create<AppState>((set, get) => ({
  matchIndex: null,
  matchDataMap: {},
  currentMatch: null,
  heatmapData: {},
  loading: false,
  uploading: false,

  selectedMap: 'all',
  selectedDate: 'all',
  searchQuery: '',

  selectedMatchId: null,

  visiblePlayerIds: new Set(),
  showBots: false,

  currentTime: 0,
  maxTime: 0,
  isPlaying: false,
  playbackSpeed: 1,

  showUploadModal: false,

  heatmapMode: 'off',

  setMatchIndex: (index) => set({ matchIndex: index }),
  setMatchDataMap: (map) => set({ matchDataMap: map }),
  setCurrentMatch: (match) => set({ currentMatch: match }),
  setHeatmapData: (mapId, data) =>
    set((state) => ({
      heatmapData: { ...state.heatmapData, [mapId]: data },
    })),
  setAllHeatmapData: (data) => set({ heatmapData: data }),
  setLoading: (loading) => set({ loading }),
  setUploading: (uploading) => set({ uploading }),
  setSelectedMap: (map) => set({ selectedMap: map }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedMatchId: (id) => set({ selectedMatchId: id }),

  // Load match from in-memory matchDataMap
  selectMatch: (id) => {
    const data = get().matchDataMap[id]
    if (!data) return

    let maxT = 0
    data.players.forEach((p) => {
      p.events.forEach((e) => {
        if (e.t > maxT) maxT = e.t
      })
    })

    const humanIds = data.players.filter((p) => p.human).map((p) => p.id)

    set({
      selectedMatchId: id,
      currentMatch: data,
      isPlaying: false,
      currentTime: maxT,
      maxTime: maxT,
      visiblePlayerIds: new Set(humanIds),
    })
  },

  togglePlayerVisibility: (playerId) =>
    set((state) => {
      const next = new Set(state.visiblePlayerIds)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return { visiblePlayerIds: next }
    }),
  setAllPlayersVisible: (playerIds) =>
    set({ visiblePlayerIds: new Set(playerIds) }),
  setShowBots: (show) => set({ showBots: show }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setMaxTime: (time) => set({ maxTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setShowUploadModal: (show) => set({ showUploadModal: show }),
  setHeatmapMode: (mode) => set({ heatmapMode: mode }),

  clearData: () => {
    clearStoredData().catch(() => {})
    return set({
      matchIndex: null,
      matchDataMap: {},
      currentMatch: null,
      heatmapData: {},
      selectedMap: 'all',
      selectedDate: 'all',
      searchQuery: '',
      selectedMatchId: null,
      visiblePlayerIds: new Set(),
      showBots: false,
      currentTime: 0,
      maxTime: 0,
      isPlaying: false,
      playbackSpeed: 1,
      showUploadModal: false,
      heatmapMode: 'off',
    })
  },
}))
