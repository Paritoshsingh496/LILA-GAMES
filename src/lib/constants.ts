export const MAP_CONFIG: Record<string, { scale: number; originX: number; originZ: number }> = {
  AmbroseValley: { scale: 900, originX: -370, originZ: -473 },
  GrandRift: { scale: 581, originX: -290, originZ: -290 },
  Lockdown: { scale: 1000, originX: -500, originZ: -500 },
}

export const MAP_IMAGES: Record<string, string> = {
  AmbroseValley: '/minimaps/AmbroseValley_Minimap.png',
  GrandRift: '/minimaps/GrandRift_Minimap.png',
  Lockdown: '/minimaps/Lockdown_Minimap.jpg',
}

// Event abbreviation → display name
export const EVENT_NAMES: Record<string, string> = {
  P: 'Position',
  BP: 'Bot Position',
  K: 'Kill',
  D: 'Killed',
  BK: 'Bot Kill',
  BD: 'Bot Killed',
  S: 'Storm Death',
  L: 'Loot',
}

// Colors for event markers
export const EVENT_COLORS: Record<string, string> = {
  K: '#ff4444',   // Kill - red
  D: '#ff8800',   // Killed - orange
  BK: '#888888',  // Bot Kill - grey
  BD: '#000000',  // Bot Killed - black
  S: '#aa44ff',   // Storm Death - purple
  L: '#44ff44',   // Loot - green
}

// Bright colors for human player paths
export const PLAYER_COLORS = [
  '#00ffff', // cyan
  '#ff44ff', // magenta
  '#ffff00', // yellow
  '#44ff88', // green
  '#ff8844', // orange
  '#4488ff', // blue
  '#ff4488', // pink
  '#88ff44', // lime
  '#8844ff', // purple
  '#44ffff', // aqua
  '#ff4444', // red
  '#44ff44', // bright green
]

export const BOT_PATH_COLOR = '#ffff00'
export const BOT_PATH_WIDTH = 2
export const HUMAN_PATH_WIDTH = 2

export const CANVAS_SIZE = 1024

export const HEATMAP_COLORS: Record<string, { color: string; label: string }> = {
  kills: { color: 'red', label: 'Kill Zones' },
  deaths: { color: 'orange', label: 'Death Zones' },
  traffic: { color: 'blue', label: 'Traffic' },
  loot: { color: 'green', label: 'Loot Spots' },
  storm: { color: 'purple', label: 'Storm Deaths' },
}
