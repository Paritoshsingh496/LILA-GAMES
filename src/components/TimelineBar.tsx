'use client'

import { useStore } from '@/lib/store'
import { usePlayback } from '@/hooks/usePlayback'
import { HEATMAP_COLORS } from '@/lib/constants'
import type { HeatmapMode } from '@/lib/types'

export default function TimelineBar() {
  usePlayback()

  const currentMatch = useStore((s) => s.currentMatch)
  const currentTime = useStore((s) => s.currentTime)
  const maxTime = useStore((s) => s.maxTime)
  const isPlaying = useStore((s) => s.isPlaying)
  const playbackSpeed = useStore((s) => s.playbackSpeed)
  const heatmapMode = useStore((s) => s.heatmapMode)

  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setIsPlaying = useStore((s) => s.setIsPlaying)
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed)
  const setHeatmapMode = useStore((s) => s.setHeatmapMode)

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleRestart = () => {
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const handleEnd = () => {
    setCurrentTime(maxTime)
    setIsPlaying(false)
  }

  const speeds = [1, 2, 4, 8]

  return (
    <div className="bg-[var(--bg-secondary)] border-t border-[var(--border)] px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRestart}
            disabled={!currentMatch}
            className="px-2 py-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
            title="Restart"
          >
            {'\u23EE'}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!currentMatch}
            className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90 disabled:opacity-30 transition-colors font-medium"
          >
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <button
            onClick={handleEnd}
            disabled={!currentMatch}
            className="px-2 py-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:bg-[var(--border)] disabled:opacity-30 transition-colors"
            title="End"
          >
            {'\u23ED'}
          </button>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                playbackSpeed === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timeline slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] font-mono w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={maxTime || 100}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            disabled={!currentMatch}
            className="flex-1"
          />
          <span className="text-xs text-[var(--text-secondary)] font-mono w-10">
            {formatTime(maxTime)}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)]" />

        {/* Heatmap controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-secondary)] mr-1">Heatmap:</span>
          <button
            onClick={() => setHeatmapMode('off')}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              heatmapMode === 'off'
                ? 'bg-[var(--bg-tertiary)] border-[var(--accent)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            Off
          </button>
          {(Object.keys(HEATMAP_COLORS) as HeatmapMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setHeatmapMode(mode)}
              className={`px-2 py-1 text-xs rounded border transition-colors capitalize ${
                heatmapMode === mode
                  ? 'bg-[var(--bg-tertiary)] border-[var(--accent)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              {HEATMAP_COLORS[mode].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
