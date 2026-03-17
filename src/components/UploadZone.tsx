'use client'

import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { parseParquetFiles } from '@/lib/parquetParser'
import { saveData } from '@/lib/storage'
import type { MatchIndex, HeatmapData } from '@/lib/types'

function mergeHeatmaps(
  existing: Record<string, HeatmapData>,
  incoming: Record<string, HeatmapData>
): Record<string, HeatmapData> {
  const merged = { ...existing }
  for (const mapId of Object.keys(incoming)) {
    if (!merged[mapId]) {
      merged[mapId] = incoming[mapId]
    } else {
      const e = merged[mapId]
      const n = incoming[mapId]
      merged[mapId] = {
        ...e,
        kills: e.kills.map((row, y) => row.map((v, x) => v + (n.kills[y]?.[x] ?? 0))),
        deaths: e.deaths.map((row, y) => row.map((v, x) => v + (n.deaths[y]?.[x] ?? 0))),
        traffic: e.traffic.map((row, y) => row.map((v, x) => v + (n.traffic[y]?.[x] ?? 0))),
        loot: e.loot.map((row, y) => row.map((v, x) => v + (n.loot[y]?.[x] ?? 0))),
      }
    }
  }
  return merged
}

function mergeMatchIndex(existing: MatchIndex | null, incoming: MatchIndex): MatchIndex {
  if (!existing) return incoming

  // Deduplicate matches by id
  const existingIds = new Set(existing.matches.map((m) => m.id))
  const newMatches = incoming.matches.filter((m) => !existingIds.has(m.id))
  const allMatches = [...existing.matches, ...newMatches]

  const maps = [...new Set([...existing.stats.maps, ...incoming.stats.maps])].sort()
  const dates = [...new Set([...existing.stats.dates, ...incoming.stats.dates])].sort()

  return {
    matches: allMatches,
    stats: {
      totalMatches: allMatches.length,
      totalPlayers: existing.stats.totalPlayers + incoming.stats.totalPlayers,
      totalEvents: existing.stats.totalEvents + incoming.stats.totalEvents,
      maps,
      dates,
    },
  }
}

export default function UploadZone() {
  const showUploadModal = useStore((s) => s.showUploadModal)
  const setShowUploadModal = useStore((s) => s.setShowUploadModal)
  const setMatchIndex = useStore((s) => s.setMatchIndex)
  const setMatchDataMap = useStore((s) => s.setMatchDataMap)
  const setAllHeatmapData = useStore((s) => s.setAllHeatmapData)
  const setUploading = useStore((s) => s.setUploading)

  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ matches: number; players: number; events: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      setError(null)
      setUploading(true)
      setProgress({ done: 0, total: files.length })

      try {
        const result = await parseParquetFiles(files, (done, total) => {
          setProgress({ done, total })
        })

        const existingIndex = useStore.getState().matchIndex
        const existingDataMap = useStore.getState().matchDataMap
        const existingHeatmap = useStore.getState().heatmapData

        const mergedIndex = mergeMatchIndex(existingIndex, result.matchIndex)
        const mergedDataMap = { ...existingDataMap, ...result.matchDataMap }
        const mergedHeatmap = mergeHeatmaps(existingHeatmap, result.heatmapData)

        setMatchIndex(mergedIndex)
        setMatchDataMap(mergedDataMap)
        setAllHeatmapData(mergedHeatmap)

        await saveData({
          matchIndex: mergedIndex,
          matchDataMap: mergedDataMap,
          heatmapData: mergedHeatmap,
        })

        setSummary({
          matches: mergedIndex.stats.totalMatches,
          players: mergedIndex.stats.totalPlayers,
          events: mergedIndex.stats.totalEvents,
        })
      } catch (err) {
        console.error('Parse error:', err)
        const msg = err instanceof Error ? err.message.replace(/\s*\(.*?\)/g, '') : 'Failed to parse files'
        setError(msg)
      } finally {
        setUploading(false)
        setProgress(null)
      }
    },
    [setMatchIndex, setMatchDataMap, setAllHeatmapData, setUploading, setShowUploadModal]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      handleFiles(files)
    },
    [handleFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      handleFiles(files)
    },
    [handleFiles]
  )

  if (!showUploadModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl max-w-[540px] w-full mx-4">
        <button
          onClick={() => setShowUploadModal(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            Upload Dataset
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload telemetry data to explore player behavior on maps
          </p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            w-full h-[160px] rounded-xl border-2 border-dashed
            flex flex-col items-center justify-center gap-3 transition-all
            ${
              dragging
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]'
                : 'border-[var(--border)] bg-[var(--bg-tertiary)]'
            }
          `}
        >
          {summary ? (
            <>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div className="text-sm text-[var(--text-primary)] font-medium">
                Data loaded successfully
              </div>
              <div className="text-xs text-[var(--text-secondary)] text-center">
                {summary.matches} matches &middot; {summary.players} players &middot; {summary.events.toLocaleString()} events
              </div>
            </>
          ) : progress ? (
            <>
              <div className="w-10 h-10 border-[3px] border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
              <div className="text-sm text-[var(--text-primary)]">
                Parsing files... {progress.done} / {progress.total}
              </div>
              <div className="w-48 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all rounded-full"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[var(--text-secondary)]"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-sm text-[var(--text-secondary)]">
                Drag & drop files here
              </div>
            </>
          )}
        </div>

        {summary ? (
          <div className="mt-4">
            <button
              onClick={() => { setSummary(null); setShowUploadModal(false) }}
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
            >
              Continue
            </button>
          </div>
        ) : !progress && (
          <>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors"
              >
                Select Files
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                Select Folder
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
              Use &quot;Select Folder&quot; to auto-detect dates from folder names (e.g. February_10)
            </p>
          </>
        )}

        {error && (
          <div className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileSelect}
          className="hidden"
        />

        {/* Folder picker */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in standard types
          webkitdirectory=""
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
