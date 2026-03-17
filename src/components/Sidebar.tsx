'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { PLAYER_COLORS, EVENT_NAMES, EVENT_COLORS } from '@/lib/constants'
import type { MatchIndexEntry } from '@/lib/types'

export default function Sidebar() {
  const matchIndex = useStore((s) => s.matchIndex)
  const selectedMap = useStore((s) => s.selectedMap)
  const selectedDateFrom = useStore((s) => s.selectedDateFrom)
  const selectedDateTo = useStore((s) => s.selectedDateTo)
  const searchQuery = useStore((s) => s.searchQuery)
  const selectedMatchId = useStore((s) => s.selectedMatchId)
  const currentMatch = useStore((s) => s.currentMatch)
  const visiblePlayerIds = useStore((s) => s.visiblePlayerIds)
  const showBots = useStore((s) => s.showBots)

  const setSelectedMap = useStore((s) => s.setSelectedMap)
  const setSelectedDateFrom = useStore((s) => s.setSelectedDateFrom)
  const setSelectedDateTo = useStore((s) => s.setSelectedDateTo)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const selectMatch = useStore((s) => s.selectMatch)
  const togglePlayerVisibility = useStore((s) => s.togglePlayerVisibility)
  const setShowBots = useStore((s) => s.setShowBots)
  const visibleEventTypes = useStore((s) => s.visibleEventTypes)
  const toggleEventType = useStore((s) => s.toggleEventType)
  const selectedEvent = useStore((s) => s.selectedEvent)
  const setSelectedEvent = useStore((s) => s.setSelectedEvent)

  // Filter matches
  const sortedDates = useMemo(() => {
    return matchIndex?.stats.dates.slice().sort() ?? []
  }, [matchIndex])

  const filteredMatches = useMemo(() => {
    if (!matchIndex) return []
    return matchIndex.matches.filter((m: MatchIndexEntry) => {
      if (selectedMap !== 'all' && m.map !== selectedMap) return false
      if (selectedDateFrom !== 'all' && m.date < selectedDateFrom) return false
      if (selectedDateTo !== 'all' && m.date > selectedDateTo) return false
      if (searchQuery && !m.id.toLowerCase().includes(searchQuery.toLowerCase()))
        return false
      return true
    })
  }, [matchIndex, selectedMap, selectedDateFrom, selectedDateTo, searchQuery])

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-80 flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border)] overflow-hidden">
      {/* Filters */}
      <div className="p-3 border-b border-[var(--border)] space-y-2">
        <div className="flex gap-2">
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] outline-none"
          >
            <option value="all">All Maps</option>
            {matchIndex?.stats.maps.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedDateFrom}
            onChange={(e) => setSelectedDateFrom(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] outline-none"
          >
            <option value="all">From</option>
            {sortedDates.map((d) => (
              <option key={d} value={d}>
                {d.replace('_', ' ')}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--text-secondary)]">to</span>
          <select
            value={selectedDateTo}
            onChange={(e) => setSelectedDateTo(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] outline-none"
          >
            <option value="all">To</option>
            {sortedDates.map((d) => (
              <option key={d} value={d}>
                {d.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Search match ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
        />
        <div className="text-xs text-[var(--text-secondary)]">
          {filteredMatches.length} matches
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMatches.map((match: MatchIndexEntry) => (
          <button
            key={match.id}
            onClick={() => selectMatch(match.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors ${
              selectedMatchId === match.id ? 'bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--accent)]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {match.id.substring(0, 8)}...
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                {match.map}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>{match.date.replace('_', ' ')}</span>
              <span className="text-cyan-400">{match.humans}H</span>
              <span className="text-gray-500">{match.bots}B</span>
              <span>{formatDuration(match.duration)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Event Type Filters */}
      {currentMatch && (
        <div className="border-t border-[var(--border)]">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Event Types
            </span>
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-2">
            {Object.entries(EVENT_COLORS).map(([key, color]) => (
              <label
                key={key}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleEventTypes.has(key)}
                  onChange={() => toggleEventType(key)}
                  className="accent-[var(--accent)]"
                />
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[var(--text-secondary)]">
                  {EVENT_NAMES[key] || key}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Event Details
            </span>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Event</span>
              <span className="text-[var(--text-primary)]" style={{ color: EVENT_COLORS[selectedEvent.event] }}>
                {EVENT_NAMES[selectedEvent.event] || selectedEvent.event}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Player</span>
              <span className="text-[var(--text-primary)] font-mono text-xs">
                {selectedEvent.human ? 'Human' : 'Bot'}: {selectedEvent.playerId.substring(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Location</span>
              <span className="text-[var(--text-primary)] font-mono text-xs">
                ({selectedEvent.x}, {selectedEvent.z})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Player List (when match selected) */}
      {currentMatch && (
        <div className="border-t border-[var(--border)] max-h-[300px] overflow-y-auto">
          <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Players
            </span>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={showBots}
                onChange={(e) => setShowBots(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Show Bots
            </label>
          </div>

          {currentMatch.players
            .filter((p) => p.human || showBots)
            .map((player, idx) => {
              const colorIdx = currentMatch.players
                .filter((p) => p.human)
                .findIndex((p) => p.id === player.id)
              const color = player.human
                ? PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]
                : '#666'

              return (
                <label
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-tertiary)] cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={visiblePlayerIds.has(player.id)}
                    onChange={() => togglePlayerVisibility(player.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-xs truncate">
                    {player.human
                      ? player.id.substring(0, 12) + '...'
                      : `Bot ${player.id}`}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-secondary)]">
                    {player.events.length} evt
                  </span>
                </label>
              )
            })}
        </div>
      )}
    </div>
  )
}
