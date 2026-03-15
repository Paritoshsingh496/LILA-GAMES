'use client'

import { useStore } from '@/lib/store'

export default function StatsHeader() {
  const matchIndex = useStore((s) => s.matchIndex)
  const currentMatch = useStore((s) => s.currentMatch)
  const setShowUploadModal = useStore((s) => s.setShowUploadModal)
  const clearData = useStore((s) => s.clearData)

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-[var(--accent)]">LILA</span>
          <span className="text-[var(--text-primary)]"> BLACK</span>
          <span className="text-[var(--text-secondary)] font-normal text-sm ml-2">
            Player Journey Visualizer
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        {matchIndex && currentMatch && (
          <>
            <span>
              Match: <span className="text-[var(--text-primary)] font-mono">{currentMatch.id.substring(0, 8)}</span>
            </span>
            <span>
              Map: <span className="text-[var(--text-primary)]">{currentMatch.map}</span>
            </span>
            <span>
              Players: <span className="text-cyan-400">{currentMatch.players.filter(p => p.human).length}H</span>
              {' / '}
              <span className="text-gray-400">{currentMatch.players.filter(p => !p.human).length}B</span>
            </span>
          </>
        )}
        {matchIndex && !currentMatch && (
          <>
            <span>{matchIndex.stats.totalMatches} matches</span>
            <span>{matchIndex.stats.totalPlayers} players</span>
            <span>{matchIndex.stats.totalEvents.toLocaleString()} events</span>
          </>
        )}
        <button
          onClick={() => setShowUploadModal(true)}
          className="ml-2 px-3 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors"
        >
          Add Data
        </button>
        {matchIndex && (
          <button
            onClick={clearData}
            className="px-3 py-1 rounded bg-[var(--bg-tertiary)] border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
          >
            Clear Data
          </button>
        )}
      </div>
    </header>
  )
}
